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

    galleriesContainer.innerHTML = galleries
      .map((gallery) => {
        const title = escapeHtml(gallery.title || "Untitled gallery");
        const count = typeof gallery.count === "number" ? `${gallery.count} photos` : "";
        const href = `/photo/gallery/?gallery=${encodeURIComponent(gallery.slug)}`;
        const cover = gallery.cover
          ? `<img src="${escapeAttribute(gallery.cover)}" alt="${title}" loading="lazy" decoding="async" />`
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
