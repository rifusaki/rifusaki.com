---
title: "coreMPE"
excerpt: "Core script from Adenzu's project that takes manga pages and outputs the panels on them—now with subdirectories!"
author_profile: true
sidebar:
  - title: "Repo"
    text: "[rifusaki/coreMPE](https://github.com/rifusaki/coreMPE)"
order: 7
---

# coreMPE

A fork of [Adenzu's Manga-Panel-Extractor](https://github.com/adenzu/Manga-Panel-Extractor). This simple program takes manga pages and automatically computes bounding boxes to extract and output individual panels from them.

My fork isolates the core extraction scripts and introduces *ubdirectory support. This allows you to extract panels while retaining the organizational hierarchy of your input folders (e.g. keeping panels organized by Volume or Chapter subfolders) instead of dumping them all into a single directory.

## Usage
The extraction can be used as a CLI tool:
```bash
python main.py [input_dir] [output_dir] [-s] [-f] [-g]
```

Where `-s` splits joint panels, and `-f` triggers a more aggressive fallback extraction method if the first one fails.
