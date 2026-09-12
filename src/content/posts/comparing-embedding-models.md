---
title: "recall finds your old Claude Code sessions with a local embedding model. Picking which one was the hard part."
description: "recall searches your Claude Code and Codex sessions locally, with an embedding model. A newer drop-in model showed up, and finding out whether it was actually better meant writing my own answer key and catching my own benchmark cheating."
pubDatetime: 2026-09-12T09:00:00-07:00
modDatetime: 2026-09-12T15:20:00-07:00
draft: false
tags: ["recall", "embeddings", "claude-code"]
---

[recall](https://github.com/ramsrib/recall-cli) searches your old Claude Code and Codex
sessions. You type something like "that time we argued about sqlite vs a vector db" and it
finds the session, even though those exact words probably aren't in the transcript. It does
that with a local embedding model: text goes in, a vector comes out, and things that *mean*
the same thing land near each other whether or not they share any words.

A newer embedding model showed up that was a drop-in. Same 1024 dimensions as the one I was
using, newer architecture, smaller on disk. Switching would be a re-index and nothing else.
The only question was whether it was actually better, and I figured that would be the easy
part.

It was not the easy part.

## The obvious way to check is worthless

The obvious move is to run a few searches with each model and look. I did this. It looked fine. It also looked fine with the old
one. That's the problem with looking: you pick queries you already know the answer to, you
see what you expect to see, and the differences that actually separate two decent models
are too small to notice by eye. "Feels better" isn't a measurement.

What you need is a number. Same test, same scoring, both models, and one of them wins or
they tie.

## The answer key is the actual work

A retrieval benchmark needs three things: the documents (I have ~213 sessions, ~11k
chunks), a set of queries, and, for each query, which session is the right answer. The
third one is the whole difficulty. Without an answer key you can run all the searches you
want and still can't say anything scored "right."

And for your own private data, nobody has written that key. There is no public dataset of
*my* sessions. So I wrote it: 22 queries, each aimed at a session I knew was in there.
Deliberately paraphrased, so the query says "rust cargo metadata failure" and the session
is titled "Fix cargo metadata error in iOS build." If the words matched, grep would pass
the test, and then what would I even be measuring.

There's a tempting shortcut here that I want to call out because it's genuinely seductive.
recall logs every search, including which sessions came back. Why not use those as the
labels? Because that's the model grading its own homework. Whatever it returned is, by
definition, what it returned. Every model scores 100% on the test of "did you find what you
found." Labels have to come from *outside* the thing you're testing. That means either a
human judging results blind, or, the version I haven't built yet, logging which result you
actually *open* after a search. That click is a label, and it's how the big search engines
do it. Someday.

## Two numbers

Run a query, get a ranked list. Where did the right session land?

**Recall@k** is the fraction of queries where the right answer showed up in the top *k*.
Recall@1 is "was it the first result." Recall@5 is "was it on the shortlist." They matter
for different reasons: if an agent is going to act on the first hit, Recall@1 is
everything; if a human is scanning a list, Recall@5 is plenty.

**MRR** (mean reciprocal rank) turns the rank into a score: 1 for first place, 1/2 for
second, 1/3 for third, 0 for missing, averaged over all the queries. It's dominated by the
gap between first and second, so when MRR goes up, answers are climbing toward the top of
the list.

That's it. There's a fancier one (nDCG) for when some answers are more right than others,
but my labels are yes/no, so it would add nothing.

## My benchmark almost lied to me

Here's the part I'm glad I caught before I published a number.

Embedding models want their input in a specific shape. bge-m3, the old model, wants a
prefix: `search_document:` on stored text, `search_query:` on queries. qwen3 wants
documents bare and queries wrapped in an instruction. recall had the bge prefixes
hardcoded for every model. So qwen3 was being fed the wrong format, any comparison would
have quietly handicapped it, and the benchmark would have "proven" the old model was better
with total confidence.

A benchmark can be unfair before it's wrong. I fixed the conditioning so each model gets
its own recipe, and only then ran the thing.

## Results

Both models indexed over the same sessions, into separate databases, driven through the
real `recall` binary rather than some reimplementation, so what I measured is what I'd
actually get.

| model | mode | Recall@1 | Recall@5 | Recall@10 | MRR |
|---|---|---|---|---|---|
| bge-m3 | semantic | 0.73 | 0.91 | 0.95 | 0.793 |
| **qwen3-embedding:0.6b** | semantic | **0.82** | 0.91 | 0.95 | **0.869** |
| bge-m3 | hybrid | 0.73 | 0.91 | 0.95 | 0.808 |
| **qwen3-embedding:0.6b** | hybrid | **0.77** | 0.91 | 0.95 | **0.825** |

Both models get the right session into the top 5 exactly as often. qwen3 gets it to *#1*
more often, 82% vs 73%, and its MRR is higher to match. So the new model isn't finding
more; it's ordering better. Hybrid mode (embeddings blended with keyword search) narrows
the gap, because BM25 carries some of the load either way.

Cost: qwen3 indexes at about half the speed (~4.9 chunks/s vs ~9.7), which is a one-time
hit. Query latency is the same, since both are 1024 dims and the cosine math is identical.
And it's smaller on disk, 639 MB vs 1.2 GB.

I switched.

## What this is actually worth

Twenty-two queries. The Recall@1 gap is two queries flipping. Claude wrote the queries from
session content, which means there's a chance the phrasing subtly favors one model. I gave
qwen3 its proper prompt recipe and left bge on its defaults, so I haven't proven bge
couldn't do better bare. No significance test. And nobody, including you, can reproduce
these numbers, because the answer key is session IDs from my private transcripts. Against
your index, every query scores zero.

So read it as: I checked, on my data, it pointed one way, and that way matches the public
benchmarks. That's what a benchmark on your own stuff is worth. It's still a lot more than
vibes.

The method is reusable even if the numbers aren't. If you run recall and want to do this on
your own sessions, the
[eval script and fixture format are in the repo](https://github.com/ramsrib/recall-cli/tree/main/eval).
Write your own 22 queries. That's the work.
