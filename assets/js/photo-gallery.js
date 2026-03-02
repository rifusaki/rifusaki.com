const galleryTitleElement = document.getElementById("photo-gallery-title");
const gridElement = document.getElementById("photo-grid");
const lightbox = document.getElementById("photo-lightbox");
const lightboxImage = document.getElementById("photo-lightbox-image");
const closeButton = lightbox ? lightbox.querySelector(".photo-lightbox__close") : null;
const prevButton = lightbox ? lightbox.querySelector(".photo-lightbox__prev") : null;
const nextButton = lightbox ? lightbox.querySelector(".photo-lightbox__next") : null;

let images = [];
let activeIndex = -1;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function queryGallerySlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get("gallery");
}

function setGridMessage(message) {
  if (gridElement) {
    gridElement.innerHTML = `<p>${message}</p>`;
  }
}

function renderLightbox(index) {
  if (!lightbox || !lightboxImage || index < 0 || index >= images.length) {
    return;
  }

  activeIndex = index;
  lightboxImage.src = images[index].url;
  lightboxImage.alt = images[index].key;
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  document.body.classList.add("lightbox-open");
}

function hideLightbox() {
  if (!lightbox || !lightboxImage) return;
  lightbox.hidden = true;
  lightboxImage.src = "";
  activeIndex = -1;
  document.body.style.overflow = "";
  document.body.classList.remove("lightbox-open");
}

function moveLightbox(step) {
  if (images.length === 0 || activeIndex < 0) return;
  const nextIndex = (activeIndex + step + images.length) % images.length;
  renderLightbox(nextIndex);
}

function bindLightboxEvents() {
  if (closeButton) {
    closeButton.addEventListener("click", hideLightbox);
  }

  if (prevButton) {
    prevButton.addEventListener("click", () => moveLightbox(-1));
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => moveLightbox(1));
  }

  if (lightbox) {
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        hideLightbox();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (!lightbox || lightbox.hidden) return;
    if (event.key === "Escape") hideLightbox();
    if (event.key === "ArrowLeft") moveLightbox(-1);
    if (event.key === "ArrowRight") moveLightbox(1);
  });
}

function renderGrid() {
  if (!gridElement) return;

  if (images.length === 0) {
    setGridMessage("No images in this gallery yet.");
    return;
  }

  gridElement.innerHTML = images
    .map(
      (image, index) => `
      <button class="photo-grid__item" data-index="${index}" type="button" aria-label="Open image ${index + 1}">
        <img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.key)}" loading="lazy" decoding="async" />
      </button>
    `
    )
    .join("");

  gridElement.querySelectorAll(".photo-grid__item").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.getAttribute("data-index"));
      renderLightbox(index);
    });
  });
}

async function loadGallery() {
  const slug = queryGallerySlug();

  if (!slug) {
    if (galleryTitleElement) {
      galleryTitleElement.textContent = "Gallery not selected";
    }
    setGridMessage("Pick a gallery from the portfolio page.");
    return;
  }

  setGridMessage("Loading images...");

  try {
    const response = await fetch(`/api/gallery/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    images = payload.images || [];

    if (galleryTitleElement) {
      galleryTitleElement.textContent = payload.title || "Gallery";
    }

    renderGrid();
  } catch (error) {
    if (galleryTitleElement) {
      galleryTitleElement.textContent = "Gallery unavailable";
    }
    setGridMessage("Could not load this gallery right now.");
  }
}

bindLightboxEvents();
loadGallery();
