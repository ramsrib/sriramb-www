---
title: "Swapping the embedding model was easy. Knowing if it helped was not."
description: "I switched recall's embedding model and had no way to tell if search got better. Every cheap way to check lies to you, so I had to write the answer key myself."
pubDatetime: 2026-09-12T09:00:00-07:00
modDatetime: 2026-09-12T14:30:00-07:00
draft: false
tags: ["embeddings", "search", "evaluation"]
---

I switched recall's embedding model, and then realized I had no idea whether search had
actually gotten better.

Swapping it is nothing. Both models spit out 1024 numbers, so it's a re-index and you're
done. Knowing whether the swap *helped* is the whole problem. Running a few searches and
eyeballing the results just tells you what you already believed. The query log can't help
either, because grading a model against the results it returned is circular. And the first
version of my comparison was quietly feeding one model the other one's prompt format, which
would have crowned the wrong winner without anyone noticing.

What you actually need is an answer key, and on a private corpus nobody is going to write
it for you.

This is how I built one. If you just want the numbers, they're in
[the repo](https://github.com/ramsrib/recall-cli/blob/main/docs/embedding-models.md).

## 1. What I'm actually trying to do

[recall](https://github.com/ramsrib/recall-cli) searches your past Claude Code and Codex
sessions. You type a question in plain English:

> "that discussion about why we picked sqlite over a vector database"

and it should return the *session where you actually discussed that*, even though you
didn't type the exact words that appear in the transcript. That last part is the hard bit.
A plain keyword search (`grep`) only finds documents containing your literal words. I want
**meaning-based** search. That's what an *embedding model* gives you.

## 2. What is an embedding? (the one concept to understand)

An **embedding model** turns a piece of text into a list of numbers, a **vector**, like:

```
"vector database tradeoffs"  →  [0.02, -0.11, 0.39, ... ]   (1024 numbers)
```

The magic property: **texts that mean similar things get vectors that are close together**,
and texts that mean different things get vectors that are far apart. "vector database
tradeoffs" and "why we chose sqlite over lancedb" land near each other even though they
share no words.

"Close together" is measured with **cosine similarity**, a number from -1 to 1:

- **1.0** = pointing the same direction (very similar meaning)
- **0.0** = unrelated
- **negative** = opposite

So search works like this:

1. **Index time:** embed every chunk of every session, store ~11,000 vectors.
2. **Query time:** embed your question into one vector.
3. Compute cosine similarity between your question's vector and all 11,000 chunk vectors.
4. Return the sessions whose chunks scored highest.

> In an early smoke test, a *relevant* query scored **0.81** against the right session and
> an *off-topic* query scored **0.40**. That gap is the model "working": relevant things
> score higher.

The embedding model is the thing that produces these vectors. **A better model produces
vectors where "close = actually relevant" holds more reliably.** Two models can both output
1024 numbers but disagree about what's close to what, so one can be better at finding the
right session. That's exactly what I want to measure.

### A note on "1024 dimensions"

The vector has 1024 numbers, so it's **1024-dimensional**. Both models I compared
output 1024 numbers, which matters practically: the storage size and the math cost are
identical, so any difference is purely *quality*, not *cost*. (A model that output 4096
numbers would be 4x the storage and slower to compare.)

## 3. Why you can't just "eyeball" it

The tempting approach: run a few searches with each model, look at the results, pick the one
that "feels" better. This is **unreliable** because:

- You'll unconsciously cherry-pick queries that confirm what you already believe.
- "Feels better" isn't comparable across people or over time.
- Small differences (the kind that actually separate two good models) are invisible to
  eyeballing.

To compare fairly you need a **benchmark**: a fixed test you can run on both models and get
a **number** out of. Same test, same scoring, both models, and now the comparison is
apples-to-apples.

## 4. The ingredients of a retrieval benchmark

To score "how good is search," you need three things:

1. **A corpus**, the documents being searched. I have this: ~213 sessions, ~11k chunks.
2. **A set of queries**, realistic questions someone would actually type.
3. **Ground truth** (a.k.a. "gold labels"): *for each query, which session is the right
   answer?*

The third one is the crux and the hard part. To grade an exam you need the answer key. Here,
the answer key is: "when I search for *X*, the correct session is *this one*." Without it,
you have no way to say a model got it "right."

**How I built ground truth:** I have a rare advantage, in that it's *my own* history, so
I know what's in it. I picked ~22 specific sessions with distinctive topics, and for each
one wrote a natural-language query that it should answer, recording that session's ID as the
gold answer. The result is
[`eval/fixture.json`](https://github.com/ramsrib/recall-cli/blob/main/eval/fixture.json):

```json
{ "query": "fixing a rust cargo metadata failure when compiling for iOS", "gold": ["9b822ad0"] }
```

This says: *"if you search that query, session `9b822ad0` is a correct answer."* I
deliberately **paraphrased**. The query says "rust cargo metadata failure," the session title
says "Fix cargo metadata error in iOS build." Different words, same meaning. That forces the
test to measure *semantic* matching, not keyword overlap (which would be too easy and
wouldn't need embeddings at all).

Some queries have **more than one** acceptable answer (two different sessions both about
archiving a chat, say), so `gold` is a list, and a hit on *any* of them counts.

### Real queries help with realism, not labels

A natural thought: "recall now logs every search, so can't I just eval on *real* queries
instead of invented ones?" Partly. Real queries fix ingredient #2, since they're
representative and unbiased, with no risk of phrasing that secretly favors one model. But
they do **nothing** for ingredient #3: a logged query has no answer key attached. You still
have to decide which session is *correct* for each one.

And there's a trap. The query log stores the results a model *returned*. It's tempting to
treat those as the labels. **Don't.** That's circular: you'd be grading a model against its
own output, so every model scores perfectly on what it already found. Labels have to come
from *outside* the thing you're testing:

- **Manual judging.** A person reads the candidates and marks which are relevant. To be
  fair, do it with **pooling**: run *both* models, merge their top results into one list,
  and judge each entry **blind**, not knowing which model produced it. That way neither
  model is penalized for finding a relevant session the other missed, and the labeler can't
  favor one.
- **Implicit signals (the cheap dream).** If the log also recorded *which result you opened*
  after a search, that click *is* a relevance label: searched X, opened Y, so Y was
  relevant. This is how web search engines evaluate at scale. recall doesn't capture that
  yet; adding it would turn the query log into a **self-labeling** eval set with no manual
  judging.

**Bottom line:** real queries upgrade *which questions* you test. You still need a labeling
step for *what counts as right*.

## 5. The metrics (what the numbers mean)

Run a query, get back a **ranked list** of sessions. #1 is the model's best guess, #2 next,
and so on. The metrics all ask variations of: *where in that list did the right answer show
up?*

Say for one query the right answer (gold) came back at **position 3**. Its **rank = 3**.

### Recall@k, or "did it make the top k?"

**Recall@k = fraction of queries where a gold answer appears in the top *k* results.**

- **Recall@1**: was the right answer the *very first* result? (strictest)
- **Recall@5**: was it somewhere in the top 5? (more forgiving)
- **Recall@10**: top 10?

If gold landed at rank 3, that query *counts as a hit* for Recall@5 and Recall@10, but *not*
for Recall@1. Average over all queries, so "Recall@5 = 0.91" means *91% of the time, the
right session was in the top 5.*

Why several values of *k*? They answer different real questions:

- **Recall@1** matters when something acts on the first result automatically (an agent), or
  when you want the answer without scanning.
- **Recall@10** matters when a human will glance down a list anyway.

> **My key finding read through this lens:** the two models had **identical Recall@5 and
> @10**. Both put the right session in the top 5 equally often. But qwen3 had **higher
> Recall@1**, meaning it more often nailed the *exact* first spot. So they're equally good at
> "is it in the shortlist," and qwen3 is better at "is it #1."

### MRR, or "how high up, on average?"

Recall@k is yes/no at a cutoff. **MRR (Mean Reciprocal Rank)** captures *how high* the answer
ranked, as a single number. For each query you take **1 / rank** (the "reciprocal rank"):

| gold landed at rank | reciprocal rank (1/rank) |
|---|---|
| 1 | 1.00 |
| 2 | 0.50 |
| 3 | 0.33 |
| 5 | 0.20 |
| not found | 0.00 |

Then **average across all queries**. Worked example with 4 queries landing at ranks 1, 1, 2, 5:

```
(1.00 + 1.00 + 0.50 + 0.20) / 4  =  0.675   →  MRR = 0.675
```

MRR rewards getting answers near the top, and is dominated by the difference between rank 1
and rank 2 (1.00 vs 0.50 is a big drop). So **MRR going up means answers are moving toward
the top of the list**, which is why qwen3's higher MRR (0.87 vs 0.79) lines up with its
higher Recall@1.

### nDCG, the more sophisticated cousin (I didn't run it)

**nDCG** handles the case where some answers are "perfect," some "partially relevant," and
you want to reward putting the *most* relevant ones highest. It needs **graded** labels
(relevance 0/1/2/3), not just yes/no. My fixture only has binary gold (right or not right),
so MRR and Recall@k are the right tools and nDCG would add nothing here. It's on the "to make
this conclusive" list for later.

### Quality isn't everything, so also measure cost

A model can rank better but be impractical. So I also measured:

- **Indexing throughput**, chunks embedded per second, which sets how long a re-index takes.
  qwen3 was ~2x slower here.
- **Query latency**, how long one search takes end to end. Basically tied, since both are
  1024-dim, so the similarity math is identical and the model only embeds your one short
  query.
- **Model size on disk.** qwen3 is actually smaller (639 MB vs 1.2 GB).

The right model is the best **quality-for-the-cost**, not the best quality in a vacuum.

## 6. Fairness: each model has its own "prompt recipe"

A subtle but important point. Embedding models are often trained to expect their input in a
specific format:

- **bge-m3** expects a little prefix: `search_document: <text>` for stored docs,
  `search_query: <text>` for queries.
- **qwen3** expects documents *bare* (no prefix) and queries wrapped as
  `Instruct: <task>\nQuery: <text>`.

If you feed qwen3 the bge-style prefix, you're using it "wrong" and it scores worse, so a
naive comparison would unfairly punish it. An earlier version of recall hardcoded the bge
prefixes for every model, which would have under-sold qwen3 in any head-to-head. **Before
comparing, I fixed that so each model got its own recipe.**

The lesson generalizes: *a fair benchmark gives each contender its best conditions.*

## 7. How the eval was actually wired together

Putting it all together, the moving parts:

```
                    ┌─────────────────────────────┐
   eval/fixture.json│ 22 queries + gold answers   │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
   eval/run.py      │ for each query, for each model:
                    │   recall --mode … "query"   │  ← runs the REAL search code
                    │   read ranked session list  │
                    │   find rank of gold answer  │
                    │   tally Recall@k, MRR, time │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
   eval/results.json│ the scores per model/mode   │
                    └─────────────────────────────┘
```

Two details that make it trustworthy:

1. **Same corpus, two separate indexes.** I embedded *the exact same sessions* once with
   each model into two separate databases, built under separate `$HOME`s with symlinks back
   to the same session files. That way both indexes covered identical content and neither
   disturbed the other. (Comparing across models *inside* one index would be meaningless
   anyway: cosine distance between two models' vector spaces doesn't mean anything.)
2. **It drives the real `recall` binary**, not a reimplementation. The eval measures what
   you'd actually experience, including the hybrid ranking logic.

I ran it in two **modes**:

- **semantic**, pure embedding similarity. This isolates the embedding model, which is what
  I'm testing.
- **hybrid**, embeddings blended with keyword (BM25) search. Closer to real default usage,
  but it partly hides the embedding difference because keywords carry some of the load.

I report both, so you can see the model's raw effect *and* its real-world effect.

## 8. How to read the actual results

| model | mode | Recall@1 | Recall@5 | Recall@10 | MRR |
|---|---|---|---|---|---|
| bge-m3 | semantic | 0.73 | 0.91 | 0.95 | 0.793 |
| **qwen3-embedding:0.6b** | semantic | **0.82** | 0.91 | 0.95 | **0.869** |
| bge-m3 | hybrid | 0.73 | 0.91 | 0.95 | 0.808 |
| **qwen3-embedding:0.6b** | hybrid | **0.77** | 0.91 | 0.95 | **0.825** |

Reading it in English:

- **0.91 Recall@5 (both):** 91% of the time the right session was in the top 5, for *either*
  model. So both are good, and neither badly misses.
- **0.82 vs 0.73 Recall@1:** qwen3 made the right session #1 for ~82% of queries vs bge's
  ~73%.
- **0.869 vs 0.793 MRR:** consistent with the above, in that qwen3's answers sit higher
  overall.
- **Hybrid narrows the lead**, because BM25 carries part of the signal, exactly as predicted.
- **One shared miss:** neither model ranked the gold session in the top 30 for a query about
  broken homebrew formula upgrades. Same failure for both, so it's a corpus or ambiguity
  issue, not a model difference.

Conclusion: **qwen3 orders the top of the list better.** Since both an agent and a human care
most about the first result, that's a real, relevant win, bought with a slower one-time
re-index. I switched the default.

## 9. What makes an eval *trustworthy* (and where ours is weak)

Be honest about limits. A benchmark is only as good as its setup.

- **Sample size.** I used 22 queries. The Recall@1 gap (0.82 vs 0.73) is **about 2 queries
  flipping**. With so few queries, some of that could be luck. More queries (50 to 100) would
  mean more confidence. *This is the biggest weakness.*
- **Who wrote the queries.** Claude wrote them from session content. Real queries *you* type
  would be less biased, since there's a risk the phrasing subtly favors one model. The gold
  standard is queries collected "in the wild," labeled by someone who didn't see the models'
  outputs (**blind** labeling).
- **Statistical significance.** With small N, you'd ideally run a significance test to check
  the gap isn't noise. I didn't, so I call the result "suggestive," not "proven."
- **Did I give *both* models their best shot?** I gave qwen3 its proper recipe but left
  bge-m3 on its shipped prefixes. bge *might* do better bare. A truly fair fight tunes both.

There's one more limitation worth stating plainly: **the scores above are not independently
reproducible, and neither is any benchmark built this way.** The gold answers are session IDs
from a *private* transcript corpus. Against your index, none of those IDs exist, so every
query would score zero. That's a structural property of the fixture, not a bug. What's
reusable is the method, not the numbers. A genuinely public benchmark would need a shareable
corpus of transcripts, there isn't one, and building it is real work.

So read the result as "the author checked, on their data," rather than as a number you should
trust on faith.

## 10. Run it yourself

The method transfers to any corpus you have ground truth for. On your own recall index:

```sh
# 1. Replace eval/fixture.json with your own queries + gold session ids.
#    Get ids from your index:  recall "<a topic you remember>" --pretty
#    Each entry: { "query": "...", "gold": ["<8-hex session-id prefix>", ...] }

# 2. Index each model over the same corpus (separate $HOME → separate index DB),
#    so your real index stays intact.
EVAL=/tmp/recall-bge; mkdir -p "$EVAL"
ln -s ~/.claude "$EVAL/.claude"; ln -s ~/.codex "$EVAL/.codex"
HOME="$EVAL" recall index --model bge-m3

# 3. Score both models (Recall@k, MRR, p50 latency).
python3 eval/run.py --bge-home "$EVAL" --qwen-home "$HOME" --modes semantic hybrid
```

## Glossary

| Term | Plain meaning |
|---|---|
| **Embedding** | A list of numbers (vector) representing a text's meaning. |
| **Vector** | The list of numbers. recall's are 1024 long. |
| **Dimension** | How many numbers in the vector (1024 here). |
| **Cosine similarity** | A -1 to 1 score for how close two vectors point. Higher means more similar meaning. |
| **Corpus** | The collection of documents being searched. |
| **Query** | The search question. |
| **Ground truth / gold** | The known-correct answer(s) for a query, the "answer key." |
| **Rank** | The position of the right answer in the results (1 = top). |
| **Recall@k** | Fraction of queries whose right answer is in the top *k*. |
| **MRR** | Mean of (1 / rank) across queries. Rewards ranking answers near the top. |
| **nDCG** | Like MRR but supports graded, not just yes/no, relevance. |
| **Semantic / lexical / hybrid** | Search by meaning / by keyword (BM25) / a blend of both. |
| **BM25** | The classic keyword-relevance scoring formula behind lexical search. |
| **Latency** | Time for one search. |
| **Throughput** | How many chunks/sec you can embed (indexing speed). |
