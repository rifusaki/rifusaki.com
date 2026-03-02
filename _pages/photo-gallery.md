---
title: Photo gallery
layout: single
classes: wide
permalink: /photo/gallery/
author_profile: false
---
<p><a href="/photo/">&larr; go back</a></p>

<div id="photo-grid" class="photo-grid" aria-live="polite"></div>

<div id="photo-lightbox" class="photo-lightbox" hidden>
  <button type="button" class="photo-lightbox__close" aria-label="Close">&times;</button>
  <button type="button" class="photo-lightbox__prev" aria-label="Previous image">&larr;</button>
  <img id="photo-lightbox-image" alt="" />
  <button type="button" class="photo-lightbox__next" aria-label="Next image">&rarr;</button>
</div>

<script src="/assets/js/photo-gallery.js" defer></script>
