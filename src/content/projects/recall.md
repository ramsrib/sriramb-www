---
title: "Recall"
tagline: "Local hybrid search over every Claude Code and Codex session you've run."
description: "Recall indexes your Claude Code and Codex transcripts into one local store and answers natural-language or keyword queries from the terminal."
repo: "https://github.com/ramsrib/recall-cli"
language: "Go"
status: "active"
install: "brew install ramsrib/tap/recall"
order: 3
---

You solved this before. Six weeks ago, in a session you can't find.

Claude Code and Codex write every session to disk as JSONL, then give you no way to
search it. Recall indexes both tools into one local SQLite store and answers questions
from the terminal — hybrid semantic *and* full-text ranking, so it finds the session
whether you remember the exact error string or only what you were trying to do.

Single Go binary. No cloud service anywhere in the retrieval path; your transcripts
never leave the machine.

There's also a [macOS app](https://github.com/ramsrib/recall-app) for browsing and
reading sessions when you'd rather not be in the terminal
(`brew install --cask ramsrib/tap/recall-app`).
