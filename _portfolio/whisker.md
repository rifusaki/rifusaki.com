---
title: "whisker"
excerpt: "Simple Telegram bot to transcript audios using openai-whisper."
author_profile: true
sidebar:
  - title: "Repo"
    text: "[rifusaki/whisker](https://github.com/rifusaki/whisker)"
order: 4
---

A simple Telegram bot to transcribe voice notes and audios using `openai-whisper`. I am not particularly fond of voice notes.

## Technical Details

- **Language:** Python (`main` branch)
- **Dependency Manager:** Uses `uv` (as seen in `pyproject.toml` and `uv.lock`)

> *Note:* An active effort to port the bot entirely to **Go** for improved concurrency and performance is currently being developed in the [`whiskerGo`](https://github.com/rifusaki/whisker/tree/whiskerGo) branch.
> 