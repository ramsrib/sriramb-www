---
title: "Folio"
tagline: "A read-optimized Markdown app for macOS that opens your existing files in place."
description: "Folio is a fast, calm Markdown reader for macOS — built for reading the docs your agents write."
repo: "https://github.com/ramsrib/folio"
language: "Swift"
status: "early"
install: "brew install --cask ramsrib/tap/folio"
order: 2
---

Agents now write most of the documents in my projects. I mostly read them. Every
Markdown app I tried was built the other way around — authoring first, reading as an
afterthought.

Folio inverts that. It opens your existing `.md` files in place, with files on disk as
the source of truth, and optimizes every interaction around reading: browsing a
project's docs, searching across them, moving between them quickly. Think Obsidian,
tuned for absorbing a codebase's documentation rather than composing it.

Writing works too. It just isn't the default, and it isn't what the polish went into.

Native Swift and SwiftUI. macOS is the built target and is usable day to day; iOS
exists but is further behind.
