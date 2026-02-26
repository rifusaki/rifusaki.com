# AGENTS.md — Coding Agent Guidelines

This is a personal portfolio/blog site built with **Jekyll 3.9.5** and the
**Minimal Mistakes** remote theme, hosted on GitHub Pages. There is no
JavaScript framework, no TypeScript, and no Node.js toolchain. All content is
Markdown with YAML front matter and Liquid templating.

---

## Stack Overview

| Layer              | Technology                                      |
|--------------------|-------------------------------------------------|
| Static site gen    | Jekyll 3.9.5 (via `github-pages` gem)           |
| Theme              | Minimal Mistakes (`mmistakes/minimal-mistakes`) |
| Skin               | `mint`                                          |
| Markdown processor | kramdown (GFM parser)                           |
| Templates          | Liquid 4.0.4                                    |
| CSS preprocessor   | Sass 3.7.4                                      |
| Syntax highlight   | Rouge 3.30.0                                    |
| Hosting            | Cloudflare Pages + custom domain `rifusaki.com` |

---

## Build & Development Commands

```bash
# Install Ruby gem dependencies (requires Ruby 3.3.4 — see .ruby-version)
bundle install

# Local development server (hot-reloads content, NOT _config.yml)
bundle exec jekyll serve

# Production build (outputs to _site/)
bundle exec jekyll build

# Index content with Algolia search
ALGOLIA_API_KEY=<key> bundle exec jekyll algolia
```

**Important:** `_config.yml` changes are NOT picked up by the live server.
Restart `bundle exec jekyll serve` after editing it.

### Cloudflare Pages deployment

The site is deployed automatically on every push to `main` via Cloudflare Pages.

- **Build command:** `bundle exec jekyll build`
- **Output directory:** `_site`
- **Ruby version:** pinned to `3.3.4` via `.ruby-version`
- **Required env var:** `JEKYLL_ENV=production` (set in CF dashboard)
- **Optional env var:** `JEKYLL_GITHUB_TOKEN` — a GitHub PAT with `public_repo`
  read scope; prevents the `jekyll-github-metadata` plugin from hitting the
  GitHub API unauthenticated rate limit (60 req/hr) during builds

`Gemfile.lock` is committed to the repository (intentionally — it was previously
gitignored) to ensure deterministic builds on Cloudflare Pages. It includes both
`arm64-darwin` (local) and `x86_64-linux` (CF build runner) platforms. When
updating gems, run `bundle lock --add-platform x86_64-linux` before committing.

### Image conversion utilities

```bash
# Lossless conversion to WebP (uses ImageMagick)
./assets/toWebp.sh /path/to/source [/path/to/output]

# Lossy conversion to WebP
./assets/toWebpLossy.sh /path/to/source [/path/to/output]
```

---

## Linting & Testing

There is **no test suite** and **no linter configured** for this project.
This is intentional — it is a personal static content site.

- No HTMLProofer, RuboCop, markdownlint, ESLint, or Prettier configs exist.
- Validation is done manually by running `bundle exec jekyll serve` and
  reviewing the rendered output in a browser.
- Check the build output for Jekyll warnings/errors (broken links, missing
  layout keys, YAML parse errors) when making structural changes.

---

## Repository Structure

```
rifusaki.github.io/
├── _config.yml          # Main Jekyll configuration — touch carefully
├── _data/
│   └── navigation.yml   # Top nav menu (5 items)
├── _includes/
│   └── head/custom.html # Favicons, OG tags, Twitter cards
├── _pages/              # Static pages (404, art, CV, CV-en, photo, portfolio, year-archive)
├── _portfolio/          # Jekyll collection: coding project entries
├── _posts/              # Blog posts; filename: YYYY-MM-DD-slug.md
├── assets/
│   ├── css/main.scss    # Only SCSS file; imports theme, adds overrides
│   ├── images/          # Images organized by post slug
│   ├── files/           # Downloadable PDFs
│   ├── toWebp.sh        # Lossless WebP batch converter
│   └── toWebpLossy.sh   # Lossy WebP batch converter
├── index.html           # Homepage (splash layout with feature_row grid)
├── Gemfile              # Ruby dependencies
└── CNAME                # Custom domain: rifusaki.com
```

---

## Content Collections

### Blog Posts (`_posts/`)
- **Filename convention:** `YYYY-MM-DD-slug.md` (required by Jekyll)
- **URL pattern:** `/:categories/:title/` → e.g., `/blog/post-slug/`
- Content is primarily written in **Spanish**

### Portfolio (`_portfolio/`)
- **URL pattern:** `/portfolio/:path/`
- Sort order is controlled by `order:` integer in front matter (lower = first)

---

## Front Matter Conventions

### Blog post front matter
```yaml
---
title: "Post Title"
categories:
  - Blog
tags:
- tag1
- tag2
tagline: ""
excerpt: "Short description shown in listings."
header:
  teaser: /assets/images/post-slug/teaser.webp
  # overlay_image: /assets/images/post-slug/header.jpg  # optional
toc: true          # for long-form posts
toc_label: "Label"
toc_sticky: true
---
```

### Portfolio item front matter
```yaml
---
title: "Project Title"
excerpt: "Short project description."
author_profile: true
sidebar:
  - title: "Repo"
    text: "[user/repo](https://github.com/user/repo)"
order: 1
---
```

### Page front matter
```yaml
---
title: Page Title
layout: single
classes: wide
permalink: /slug/
author_profile: true
---
```

**Notes:**
- Quote titles that contain special characters; bare strings are fine otherwise
- Commented-out (`#`) options in front matter are left intentionally as
  documentation of available fields — preserve this pattern
- `_config.yml` sets shared defaults for posts, pages, and portfolio items
  (layout, author_profile, comments, share, related) — do not repeat these
  in individual files unless overriding

---

## Markdown & Content Style

- **Images (single):** Use Minimal Mistakes Liquid class syntax:
  ```markdown
  [![alt text](/assets/images/slug/img.webp){: .align-center style="width: 100%; border-radius: 10px;"}](/assets/images/slug/img.webp)
  ```
- **Image galleries:** Use raw HTML `<figure class="half">` or
  `<figure class="third">` with `<a><img></a>` pairs
- **Tables:** Standard GFM pipe syntax; apply Bootstrap classes with
  `{: .table .table-sm .table-striped}`
- **Footnotes:** kramdown syntax: `[^1]` inline, `[^1]:` definition at end
- **Inline HTML:** Acceptable for layout tricks on CV pages
  (`<p align="right">`, `<span style="float:left|right">`)
- **Prefer WebP** for all images; use the conversion scripts above
- Image filenames should be lowercase with hyphens, organized in a subfolder
  matching the post slug: `assets/images/post-slug/`
- Cap image dimensions at 16383px (WebP maximum)

---

## SCSS Style (`assets/css/main.scss`)

- The file requires Jekyll front matter (`---`) to be processed by jekyll-sass
- **Do not remove the front matter block** at the top of `main.scss`
- Indentation: 4 spaces at top level, 2 spaces inside `@include breakpoint()`
  mixins (existing inconsistency — follow whichever context you are in)
- Keep the two `@import` lines (`skin`, then `minimal-mistakes`) at the top
- Add overrides after the imports; keep them minimal
- Commented-out rules are kept as reference — preserve this habit

---

## Shell Script Style (`toWebp.sh` / `toWebpLossy.sh`)

- Shebang: `#!/usr/bin/env bash` (portable)
- Enable fail-fast with `set -e` at the top
- 2-space indentation
- Variables in `SCREAMING_SNAKE_CASE`
- Use guard clauses with early `exit 1` for missing arguments
- For non-fatal errors (e.g., individual file conversion failures), use soft
  recovery: `|| { echo "Warning: ..."; }` instead of hard abort

---

## Navigation (`_data/navigation.yml`)

The top nav is defined here. It has 5 items: Photography, Art, Coding, Posts,
CV. Edit this file to add, remove, or reorder nav links. URL changes in
`_pages/` must be reflected here too.

---

## Key Constraints

1. **GitHub Pages compatibility:** Only plugins listed in the
   `github-pages` gem whitelist are supported. Do not add arbitrary Jekyll
   plugins to `Gemfile` without checking compatibility.
2. **No JavaScript source files:** Do not introduce a Node.js toolchain,
   TypeScript, or JS bundler unless explicitly requested.
3. **Remote theme:** Layout and partial HTML lives inside the Minimal Mistakes
   gem and is not present locally. To override theme files, copy them into
   `_includes/` or `_layouts/` locally.
4. **`_site/` is gitignored:** Never commit build output.
5. **`Gemfile.lock` is committed:** It pins both `arm64-darwin` (local) and
   `x86_64-linux` (CF Pages) platforms. After any `bundle update`, re-run
   `bundle lock --add-platform x86_64-linux` before committing the updated lock.
