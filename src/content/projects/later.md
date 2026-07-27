---
title: "Later"
tagline: "Leave a reminder for a future coding-agent session."
description: "Later is a durable local reminder queue that lets Claude Code or Codex leave a message for a future session in the same project."
repo: "https://github.com/ramsrib/later"
language: "Go"
status: "active"
install: "brew install ramsrib/tap/later"
order: 7
---

Agent sessions are amnesiac. Something worth remembering surfaces mid-session — a
follow-up, a thing to check once a deploy lands — and there's nowhere to put it that a
*future* session will actually see.

Later is a durable local queue for exactly that. Claude Code or Codex leaves a message
for a future session in the same project, or in every project, and the message surfaces
the next time a live session gets a prompt after it's due.

It is deliberately not a notification service or a job runner. Nothing runs in the
background and nothing tries to wake a sleeping laptop. A prompt hook reads the queue;
if a reminder is due, it drops a short pointer into the active agent's context and
leaves the full body on disk until someone asks for it.
