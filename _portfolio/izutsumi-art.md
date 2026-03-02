---
title: "izutsumi.art"
excerpt: "izutsumi gallery!"
author_profile: true
sidebar:
  - title: "Website"
    text: "[izutsumi.art](https://izutsumi.art/)"
  - title: "Repo"
    text: "[rifusaki/izutsumi.art](https://github.com/rifusaki/izutsumi.art)"
order: 3
---

# izutsumi.art

the izutsumi gallery!

This is a static site gallery dedicated to archiving and organizing Izutsumi artwork and manga panels. It heavily leverages pre-rendering to create a blazing fast gallery experience.

## Stack & Performance
- Built on top of **Eleventy (v3.0.0)**.
- **Zero-JavaScript output** to ensure maximum performance and accessibility.
- **Fully Automated Image Optimization:** Uses `@11ty/eleventy-img` to automatically convert images to modern formats like AVIF and WebP, alongside native `lazy` loading without JS. It also automatically generates `<picture>` tags with calculated `srcset` sizes.
- Content is entirely driven by the Eleventy Data Cascade, keeping URLs decoupled from file locations.