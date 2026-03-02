---
title: "master summarizer"
excerpt: "Vibe coded orchestrator for ridiculously long multimodal document summarizer following examples and style guide."
author_profile: true
sidebar:
  - title: "Repo"
    text: "[rifusaki/master-summarizer](https://github.com/rifusaki/master-summarizer)"
order: 6
---

Caffeine-powered, vibe-coded multi-agent document summarization pipeline initially developed for processing Colombian municipal planning documents into a styled executive summary and 80-100 PowerPoint slide outlines. The entire pipeline coordinates multiple LLM models through an OpenCode server.

## Pipeline Stages

1. **Parse & Preprocess** - DOCX/PDF parsing + Gemini image descriptions.
2. **Chunk** - Deterministic semantic chunking (heading-aware, token-budgeted).
3. **Summarize Chunks** - Per-chunk faithful summaries (Claude Sonnet).
4. **Learn Style** - Infer style guide from example PDFs + manual guidelines (Claude Opus).
5. **Central Synthesis** - Master draft from all summaries following style guide (Claude Opus).
6. **Review** - Systematic verification + refinement loop (GPT-5.2).
7. **Slide Generation** - Structured slide outlines from final draft (GPT-5.2).

Stages 1-2 are deterministic. Stages 1b and 3-7 use LLM agents. The pipeline pauses between stages for manual confirmation and saves state for resumability. All LLM stages are resilient: each item (image, chunk, draft section, slide section) is saved atomically to disk immediately after completion. On restart, already-completed items are skipped automatically—no tokens are wasted.

## Stack
- **Python** (>= 3.11)
- **uv** for fast package management
- **OpenCode CLI** orchestrator