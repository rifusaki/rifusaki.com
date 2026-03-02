---
title: "r pixi venv"
excerpt: "VS Code extension for Pixi-managed R and Quarto virtual environments."
author_profile: true
sidebar:
  - title: "Repo"
    text: "[rifusaki/r-pixi-venv](https://github.com/rifusaki/r-pixi-venv)"
order: 2
---

A VS Code extension to use Pixi-managed virtual environments on R and Quarto. There is support for Pixi-managed R on RStudio/Positron but this is for those who would rather stay in VS Code. I'm not sure about Quarto, though.

## Features

- **Automatic environment configuration**: The extension modifies your VS Code workspace settings to point R and Quarto language services to the binaries inside your `.pixi/envs/default` directory. This assumes you have either a `pixi.toml` or `pyproject.toml` file.
- **Manual Setup Command**: You can manually trigger the configuration via the command palette: `Setup R and Quarto from Pixi`.
- **Install Dependencies**: The `Install R and Quarto to Pixi` command allows you to add `r-base`, `r-languageserver`, and `quarto` to your environment and run the setup.

Once activated, settings are automatically injected into your `.vscode/settings.json` to configure:
- `r.rpath.*`: Points to Pixi R executable
- `r.rterm.*`: Points to Pixi R terminal
- `quarto.path`: Points to Pixi Quarto executable