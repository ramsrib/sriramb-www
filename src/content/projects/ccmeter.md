---
title: "ccmeter"
tagline: "Two meters: what's left of your subscription, and how full the context window is."
description: "ccmeter watches your Claude Code and Codex subscription budget; ctxmeter watches the context window."
repo: "https://github.com/ramsrib/ccmeter"
language: "TypeScript"
status: "active"
install: "brew install ramsrib/tap/ccmeter"
order: 8
---

Two small meters for people who live in Claude Code and Codex, answering two versions
of the same question: *do I have room to start this?*

**`ccmeter`** tracks the subscription — the 5-hour window, the weekly budget, and
credit spend once you're past it. Useful before kicking off something long, and
genuinely useful for not discovering you're out mid-task.

**`ctxmeter`** tracks the current session's context window, and therefore how close you
are to an auto-compact. Different budget, same question.
