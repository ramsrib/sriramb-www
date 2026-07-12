# sriramb.com

Source for my personal site — writing, and what I'm building.

Built with [Astro](https://astro.build) on the
[AstroPaper](https://github.com/satnaing/astro-paper) theme (MIT, Sat Naing).
Deployed on Vercel; DNS and email routing on Cloudflare.

## Commands

| Command        | Action                         |
| :------------- | :----------------------------- |
| `pnpm install` | Install dependencies           |
| `pnpm dev`     | Dev server at `localhost:4321` |
| `pnpm build`   | Production build to `./dist/`  |
| `pnpm preview` | Preview the build locally      |

## Writing a post

Drop a Markdown file in `src/content/posts/`. Frontmatter:

```yaml
---
title: "Post title"
description: "One line — used for SEO and the social card."
pubDatetime: 2026-07-11T10:00:00-07:00
tags: ["agents", "tooling"]
draft: false
---
```

Social cards are generated at build time, so posts don't need an image.

## Config

Site title, description, socials, and feature flags live in `astro-paper.config.ts`.

## License

Content: © Sriram Balasubramanian, all rights reserved.
Theme code: MIT — see `LICENSE`.
