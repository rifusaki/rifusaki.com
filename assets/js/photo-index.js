const galleriesContainer = document.getElementById("photo-galleries");

function renderMessage(message) {
  if (!galleriesContainer) return;
  galleriesContainer.innerHTML = `<p>${message}</p>`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(String(value || ""));
}

/**
 * Extracts the public base URL from a pre-computed cover thumb URL.
 * e.g. "https://cdn.example.com/_thumbs/400/…" → "https://cdn.example.com"
 * Returns "" when no CDN base is detectable (falls back to /api/raw/).
 */
function extractBaseUrl(galleries) {
  for (const g of galleries) {
    if (g.coverThumb) {
      const idx = g.coverThumb.indexOf("/_thumbs/");
      if (idx !== -1) return g.coverThumb.slice(0, idx);
    }
  }
  return "";
}

/**
 * Resolves the cover thumbnail URL and original fallback URL for a gallery card.
 *
 * Priority:
 *   1. Manual override in window.GALLERY_COVERS (keyed by slug to R2 path)
 *      → returns 400px WebP thumb of the override image; original override as fallback
 *      → uses the same CDN base URL as gallery.coverThumb when available
 *   2. Pre-generated 400px WebP thumbnail (gallery.coverThumb)
 *   3. Original cover image (gallery.cover)
 *
 * Returns { src, original } where `original` is used as the onerror fallback.
 */
function resolveCoverUrl(gallery, baseUrl) {
  const overrides = window.GALLERY_COVERS || {};
  const overrideKey = overrides[gallery.slug];
  if (overrideKey) {
    const encodedKey = overrideKey.split("/").map(encodeURIComponent).join("/");
    const stem = overrideKey.slice(0, overrideKey.lastIndexOf("."));
    const encodedStem = stem.split("/").map(encodeURIComponent).join("/");
    const base = baseUrl || "/api/raw";
    return {
      src: `${base}/_thumbs/400/${encodedStem}.webp`,
      original: `${base}/${encodedKey}`,
    };
  }
  const src = gallery.coverThumb || gallery.cover || null;
  return { src, original: gallery.cover || src };
}

async function loadGalleries() {
  if (!galleriesContainer) return;

  renderMessage("Loading galleries...");

  try {
    const response = await fetch("/api/galleries");
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    const galleries = payload.galleries || [];

    if (galleries.length === 0) {
      renderMessage("No galleries found yet.");
      return;
    }

    const baseUrl = extractBaseUrl(galleries);
    galleriesContainer.innerHTML = galleries
      .map((gallery) => {
        const title = escapeHtml(gallery.title || "Untitled gallery");
        const count = typeof gallery.count === "number" ? `${gallery.count} photos` : "";
        const href = `/photo/gallery/?gallery=${encodeURIComponent(gallery.slug)}`;
        const { src: coverSrc, original: coverOriginal } = resolveCoverUrl(gallery, baseUrl);
        const cover = coverSrc
          ? `<img src="${escapeAttribute(coverSrc)}" data-original="${escapeAttribute(coverOriginal)}" alt="${title}" loading="lazy" decoding="async" onerror="if(this.src!==this.dataset.original)this.src=this.dataset.original" />`
          : "<div class=\"photo-gallery-card__placeholder\">No cover</div>";

        return `
          <article class="photo-gallery-card">
            <a class="photo-gallery-card__link" href="${href}">
              <div class="photo-gallery-card__cover">${cover}</div>
              <h3>${title}</h3>
              <p>${count}</p>
            </a>
          </article>
        `;
      })
      .join("");
  } catch (error) {
    renderMessage("Load failed.");
  }
}

loadGalleries();
