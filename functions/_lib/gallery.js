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
    if (!prefix || prefix.startsWith(".")) {
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

async function countImagesAndCover(bucket, prefix) {
  let cursor;
  let count = 0;
  let cover = null;

  do {
    const page = await bucket.list({ prefix, cursor, limit: 1000 });
    const imageObjects = (page.objects || []).filter((obj) => isImageKey(obj.key));

    if (!cover && imageObjects.length > 0) {
      cover = imageObjects[0].key;
    }

    count += imageObjects.length;
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return { count, cover };
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
      const { count, cover } = await countImagesAndCover(bucket, gallery.prefix);

      return {
        slug: gallery.slug,
        title: gallery.title,
        prefix: gallery.prefix,
        count,
        cover: cover ? publicImageUrl(request, env, cover) : null,
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
    const page = await bucket.list({ prefix: matchedPrefix, cursor, limit: 1000 });
    const next = (page.objects || [])
      .filter((obj) => isImageKey(obj.key))
      .map((obj) => ({
        key: obj.key,
        url: publicImageUrl(request, env, obj.key),
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

export { galleryBySlug, getBucket, listTopLevelGalleries, publicImageUrl };
