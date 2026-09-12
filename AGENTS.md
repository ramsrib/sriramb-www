# sriramb-www — agent guide

Sriram's personal site (`sriramb.com`): Astro 5 + the AstroPaper theme, deployed on Vercel.
`CLAUDE.md` symlinks here.

**This repo owns *shipping* a post. It does not own *writing* one.** Voice, structure, the
queue of what to write next, and the adaptation method live in the `personal-ops` repo at
`online/publishing/posts/`. Read those before drafting prose; read this for the mechanics.

## The absolute rule

**Never publish without Sriram approving the final text.** Concretely: a new post is committed
with `draft: true` and stays that way until he says otherwise. Flipping `draft: false` is his
call, not an agent's. The site is his name and voice; an obviously-AI post on it costs more
than a missing post does.

## Content collections

Three, all under `src/content/`, schemas in `src/content.config.ts`:

| collection | path | what it is |
|---|---|---|
| `posts` | `src/content/posts/` | blog posts. Renders at `/posts/<slug>/`, feeds RSS + search |
| `pages` | `src/content/pages/` | standalone pages (`about.md` → `/about/`) |
| `projects` | `src/content/projects/` | the projects list, ordered by `order` |

### Post frontmatter

```yaml
---
title: "How we compared two embedding models"
description: "One sentence for the card, the RSS entry, and the meta description."
pubDatetime: 2026-09-12T10:00:00-07:00
draft: true
tags: ["embeddings", "search", "evaluation"]
---
```

| field | required | notes |
|---|---|---|
| `title` | **yes** | string |
| `description` | **yes** | one sentence. Used for OG/meta, the post card, and RSS. Concrete, no marketing adjectives |
| `pubDatetime` | **yes** | a real date, parsed as `z.date()`. Include the offset (`-07:00` / `-08:00`) or set `timezone` |
| `draft` | — | **set `true` on every new post.** Omit or `false` only after approval |
| `tags` | — | defaults to `["others"]`. Reuse existing tags before coining one; each tag generates a page |
| `modDatetime` | — | set when editing an already-published post; drives "Updated on" |
| `featured` | — | pins to the featured section on the home page |
| `ogImage` | — | image or string. Falls back to the site default if unset |
| `canonicalURL` | — | only when the post was published elsewhere first |
| `author` | — | defaults to the configured site author. Don't set it |
| `hideEditPost` | — | hides the "Edit page" link |

Site timezone is `America/Los_Angeles` (`astro-paper.config.ts`), so a bare offset of `-07:00`
(PDT) or `-08:00` (PST) matches it. A `pubDatetime` in the **future** makes the post *scheduled*:
it stays hidden until that moment, with a 15-minute margin (`posts.scheduledPostMargin`). Don't
post-date a draft by accident and then wonder why it isn't rendering.

Filename becomes the slug: `src/content/posts/evaluating-embeddings.md` → `/posts/evaluating-embeddings/`.
Lowercase, hyphenated, no dates in the filename. A leading `_` excludes a file from the build
entirely (the glob is `**/[^_]*.{md,mdx}`), which is a useful way to park a work-in-progress.

## Local preview

```sh
pnpm install       # pnpm, not npm — there's a pnpm-workspace.yaml and a pnpm-lock.yaml
pnpm dev           # http://localhost:4321
pnpm build         # also runs astro check; catches frontmatter schema errors
```

**`pnpm build` is the frontmatter test.** A bad `pubDatetime` or a missing `description` fails
the build rather than shipping broken. Run it before committing a post.

### Previewing a draft

**`draft: true` posts 404 in `pnpm dev` too, not just in production.** `src/utils/postFilter.ts`
excludes drafts unconditionally; `import.meta.env.DEV` only relaxes the *scheduled-post* check
(a future `pubDatetime`). So there is no read-only way to see a draft rendered.

To look at one, flip the flag locally, view it, and **flip it straight back before committing**:

```sh
sed -i '' 's/^draft: true$/draft: false/' src/content/posts/<slug>.md
# view http://localhost:4321/posts/<slug>/
sed -i '' 's/^draft: false$/draft: true/' src/content/posts/<slug>.md
git diff --stat   # confirm the flag is back to true before you commit
```

Don't reach for a future `pubDatetime` as a second lock instead: dev bypasses the schedule
check, and a pushed `draft: false` post would publish *itself* when that date arrives. The
`draft` flag is the lock.

Search (`pagefind`) indexes at build time, so a new post won't appear in site search until
after a build.

## Deploy

Vercel, on push to `main`. There is no staging environment, so **the build must pass locally
before pushing** — a failed Vercel build leaves the last good deploy up, but a passing build
with an unapproved post live is the failure that matters.

## Conventions

- **Prose style is not this repo's call.** `personal-ops/online/publishing/posts/voice-longform.md`
  is the authority, including the hard no-em-dash rule. Some existing `pages/` and `projects/`
  content predates that rule and still contains em-dashes; don't copy that as precedent, and
  don't mass-edit it either without asking.
- Markdown, not MDX, unless a post genuinely needs a component.
- Theme config is `astro-paper.config.ts` and `src/config.ts`; don't edit the theme to solve a
  content problem.
- `dist/`, `.astro/`, and `.vercel/` are build output. Never commit edits to them.
