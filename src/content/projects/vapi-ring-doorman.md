---
title: "Ring Doorman"
tagline: "Let an AI assistant answer your Ring doorbell."
description: "Ring Doorman bridges a Ring live call to a Vapi voice assistant over WebRTC and websockets."
repo: "https://github.com/ramsrib/vapi-ring-doorman"
language: "TypeScript"
status: "experiment"
order: 10
---

A doorbell is a voice interface that nobody thought to connect to anything.

Ring Doorman bridges a live Ring call to a [Vapi](https://vapi.ai) voice assistant over
WebRTC and websockets, so the assistant can pick up, talk to whoever is at the door, and
handle the ninety percent of doorbell interactions that are a delivery.

This one is an experiment rather than a tool I maintain — it exists because the two
halves turned out to be connectable, and I wanted to see how the latency felt in
practice. It's a reasonable starting point if you're wiring real-time audio into a voice
agent.
