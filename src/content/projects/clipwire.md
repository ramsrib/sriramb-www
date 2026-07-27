---
title: "clipwire"
tagline: "Paste clipboard images into a program running on a remote machine over SSH."
description: "clipwire hands a remote CLI a PNG from your local clipboard — the thing that normally doesn't work over SSH."
repo: "https://github.com/ramsrib/clipwire"
language: "Go"
status: "active"
install: "brew install ramsrib/tap/clipwire"
order: 9
---

A program can only read the clipboard of the machine it runs on. So when your coding
agent is running in a tmux session on a remote box, pasting a screenshot into it simply
doesn't work — the one thing you want to do when something looks wrong.

clipwire closes that gap. It takes the image on your local clipboard, hands the remote
side a PNG file, and prints its path, which is all the remote program needed.

Built for pasting screenshots into agents over SSH, but there's nothing agent-specific
about it — anything on the far end that can take a file path works.
