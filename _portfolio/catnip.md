---
title: "catnip"
excerpt: "Extracting all Izutsumi panels since 2025. A work in progress."
author_profile: true
# header:
#   image: /assets/images/foo-bar-identity.jpg
#   teaser: /assets/images/foo-bar-identity-th.jpg
sidebar:
  - title: "Repo"
    # image: http://placehold.it/350x250
    # image_alt: "logo"
    text: "[rifusaki/catnip](https://github.com/rifusaki/catnip)"
#   - title: "Responsibilities"
#     text: "Reuters try PR stupid commenters should isn't a business model"
order: 1
---

> A work in progress

Catnip is a small Jupyter notebook for those obsessive lovers of a specific manga character with spare time and computing power.

Input some manga pages, add some seeds, and rejoice at the sight of 40 previews of matches. I haven't implemented an actual method to export the files. Yet.

## Experimental Branches
While the main branch acts as a baseline, there is active experimentation in several alternative branches exploring different bounding box (BBO) approaches, models, and environments:
- [`legacy-keras`](https://github.com/rifusaki/catnip/tree/legacy-keras): Older experimental Keras implementations.
- [`yolo-bbo`](https://github.com/rifusaki/catnip/tree/yolo-bbo): Utilizing YOLO-based models specifically tuned for Anime/Manga bounding boxes.
- [`yolo-windows`](https://github.com/rifusaki/catnip/tree/yolo-windows): Windows-specific testing and pathing for YOLO pipelines.

## Usage
This is how I'm testing this. So far.

- I suggest using [Pixi](https://pixi.sh/latest/) for package management
- Set up a directory with sample manga pages where the desired character appears
- Run panel and facial cropping cells
- Collect samples of the desired character in a separate directory
- Run panel/facial cropping cells for the rest of the manga and wait
- Point to seeds (samples) directory, run the nearest neighbor algorithm and wait (again)

### Comments
Adenzu's Panel Extractor algorithm is excellent but takes a long time to run, even without split-cell. [panelExtraction.py](src/panelExtraction.py) includes a faster albeit more basic and somewhat less accurate approach.

### Credits
- [adenzu/Manga-Panel-extractor](https://github.com/adenzu/Manga-Panel-Extractor)
- [Fuyucch1/yolov8_animeface](https://github.com/Fuyucch1/yolov8_animeface/tree/main?tab=readme-ov-file)
