const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);

function normalizeName(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function toSlug(value) {
  const normalized = normalizeName(value).toLowerCase();
  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return slug || "gallery";
}

function toTitle(prefix) {
  return prefix.replace(/\/$/, "");
}

function encodePath(path) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function publicImageUrl(request, env, key) {
  const configured = env.PHOTO_PUBLIC_BASE_URL || env.R2_PUBLIC_BASE_URL || "";
  const baseUrl = configured.replace(/\/$/, "");
  const encodedKey = encodePath(key);

  if (baseUrl) {
    return `${baseUrl}/${encodedKey}`;
  }

  const origin = new URL(request.url).origin;
  return `${origin}/api/raw/${encodedKey}`;
}

/**
 * Returns the public URL for a pre-generated WebP thumbnail stored under
 * the `_thumbs/<width>/` prefix in the same R2 bucket.
 *
 * `Gallery/photo.jpg` becomes `_thumbs/400/Gallery/photo.webp`
 */
function thumbImageUrl(request, env, key, width) {
  const lastDot = key.lastIndexOf(".");
  const stem = lastDot !== -1 ? key.slice(0, lastDot) : key;
  const thumbKey = `_thumbs/${width}/${stem}.webp`;
  return publicImageUrl(request, env, thumbKey);
}

function isImageKey(key) {
  const ext = key.split(".").pop();
  return ext ? IMAGE_EXTENSIONS.has(ext.toLowerCase()) : false;
}

async function listAllPrefixes(bucket) {
  const prefixes = [];
  let cursor;

  do {
    const page = await bucket.list({ delimiter: "/", cursor, limit: 1000 });
    prefixes.push(...(page.delimitedPrefixes || []));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return prefixes;
}

function listGalleryEntries(prefixes) {
  const entries = [];
  const usedSlugs = new Set();

  for (const prefix of prefixes) {
    // Skip hidden/system folders (dot-prefixed and underscore-prefixed, e.g. _thumbs/)
    if (!prefix || prefix.startsWith(".") || prefix.startsWith("_")) {
      continue;
    }

    const title = toTitle(prefix);
    const baseSlug = toSlug(title);
    let slug = baseSlug;
    let counter = 2;

    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    usedSlugs.add(slug);
    entries.push({ slug, title, prefix });
  }

  return entries;
}

function withTimeout(promise, ms, label) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
  );
  return Promise.race([promise, timeout]);
}

async function countImagesAndCover(bucket, prefix, request, env, timeoutMs = 10000) {
  let cursor;
  let count = 0;
  let cover = null;

  do {
    const page = await withTimeout(
      bucket.list({ prefix, cursor, limit: 1000 }),
      timeoutMs,
      `bucket.list(${prefix})`
    );
    const imageObjects = (page.objects || []).filter((obj) => isImageKey(obj.key));

    if (!cover && imageObjects.length > 0) {
      cover = imageObjects[0].key;
    }

    count += imageObjects.length;
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return {
    count,
    cover: cover ? publicImageUrl(request, env, cover) : null,
    coverThumb: cover ? thumbImageUrl(request, env, cover, 400) : null,
  };
}

function getBucket(env) {
  if (!env.PHOTOS_BUCKET) {
    throw new Error("Missing R2 binding PHOTOS_BUCKET");
  }
  return env.PHOTOS_BUCKET;
}

async function listTopLevelGalleries(env, request) {
  const bucket = getBucket(env);
  const prefixes = await listAllPrefixes(bucket);
  const entries = listGalleryEntries(prefixes);

  const galleries = await Promise.all(
    entries.map(async (gallery) => {
      let count = 0;
      let cover = null;
      let coverThumb = null;

      try {
        ({ count, cover, coverThumb } = await countImagesAndCover(
          bucket,
          gallery.prefix,
          request,
          env
        ));
      } catch (err) {
        console.error(`[gallery] Failed to count images for "${gallery.prefix}": ${err.message}`);
      }

      return {
        slug: gallery.slug,
        title: gallery.title,
        prefix: gallery.prefix,
        count,
        cover,
        coverThumb,
      };
    })
  );

  return galleries.sort((a, b) => b.title.localeCompare(a.title));
}

async function galleryBySlug(env, request, slug) {
  const bucket = getBucket(env);
  const prefixes = await listAllPrefixes(bucket);
  const entries = listGalleryEntries(prefixes);
  const gallery = entries.find((entry) => entry.slug === slug);

  if (!gallery) {
    return null;
  }

  const matchedPrefix = gallery.prefix;
  const images = [];
  let cursor;

  do {
    const page = await withTimeout(
      bucket.list({ prefix: matchedPrefix, cursor, limit: 1000 }),
      10000,
      `bucket.list(${matchedPrefix})`
    );
    const next = (page.objects || [])
      .filter((obj) => isImageKey(obj.key))
      .map((obj) => ({
        key: obj.key,
        url: publicImageUrl(request, env, obj.key),
        thumbUrl: thumbImageUrl(request, env, obj.key, 400),
        mediumUrl: thumbImageUrl(request, env, obj.key, 1200),
      }));
    images.push(...next);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  images.sort((a, b) => a.key.localeCompare(b.key));

  return {
    slug: gallery.slug,
    title: gallery.title,
    count: images.length,
    images,
  };
}

export { galleryBySlug, getBucket, listTopLevelGalleries, publicImageUrl, thumbImageUrl };
