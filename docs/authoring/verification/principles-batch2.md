# Principles Batch 2 — Adversarial Verification

**Date:** 2026-10-13
**Verifier:** independent adversarial pass (fresh context; did not author the files)
**Contract:** `docs/authoring/PRINCIPLES.md` v1.0 · **Parent:** `catalog/constitution.md`
**Scope:** 3 new files in `catalog/principles/` — `budget-retries-against-headroom`, `propagate-deadlines`, `bound-queues-and-shed-overload`
**Result:** verified **3/3** (status flipped) · rejected **0/3** — plus 1 blocking process finding against Appendix A of the execution plan (script non-idempotent; corrected rerun prints `ZERO COLLISIONS`), see Blocking findings.

## Method

1. **Structural.** An independent script re-checked all 25 files in `catalog/principles/`: id/filename match (`principle-<name>` ↔ `<name>.md`), required frontmatter, `apply_when` starts with "Apply when", keywords 2–8, `enforce` in review/both, section order (blockquote summary → `## Patterns` → `## Tests` → `## See Also`), summary ≤25 words, Patterns 3–8 bullets, Tests 3–6 bullets, every See Also target resolves and its bracketed id equals the target file's id, every `related` id resolves to an existing principle, forbidden tokens (robust, seamless, best-practice, leverage, usually, try to, placeholder, TODO, FIXME), unicode ellipsis. All three new files clean (summary words 15/17/17; Patterns 6/6/6; Tests 5/5/5; keywords 6/4/6). The built loader (`dist/rules/principles.js`) loads all 25 principles with **zero warnings**, which independently re-parses the new frontmatter.
2. **Checkability.** All 15 Tests bullets read as a batch: each asks about an artifact, command, count, state, or recorded decision available in the task; all end in "?"; no feelings or process theater. E.g. deadline arithmetic ("What is the caller's remaining budget at the moment this call starts?"), drain math ("What is the maximum backlog, and how long does it take to drain at the consumer's real rate?"), and the amplification count ("What is the worst-case offered load this retry policy adds when the dependency slows to a crawl?") are all answerable from the change under review.
3. **Originality.** Full bodies compared against all six cited pages (HTML stripped to text): **no ≥5-word overlap with any source** (longest common word sequence under five words). No upstream marketing text, no filler/hedge tokens, no placeholders, no unicode ellipsis (the only non-ASCII character in each file is the U+2014 em dash used by the established See Also format). Cross-catalog scans: title+summary Jaccard ≥ 0.35 — none; Patterns trigram max across all 300 pairs is 0.017 (existing pair `encode-lessons-in-structure` ↔ `fix-root-causes`); new-file pairs max 0.015 (`bound-queues` ↔ `budget-retries`, shared fragment "alarm on the … not only on …").
4. **Sources.** All six URLs fetched 2026-10-13 → HTTP 200; each page supports the specific claim it is cited for (table below).
5. **Overlap.** Each new principle's decision space adjudicated against the nearest existing principles (`make-operations-idempotent`, `explain-the-number`, `separate-before-serializing-shared-state`, `fix-root-causes`, `never-block-on-the-human`): no contradictory thresholds (none of the three files contains a numeric threshold at all), no duplicated decision space, no out-of-scope edit mandates. Notes below.
6. **Depth.** Nearest constitution axiom named for each principle; added mechanics confirmed (table below). No principle restates an axiom.
7. **Keyword collision.** The exact Appendix A script was rerun verbatim (output below). It printed **16 collisions — all self-collisions** (each new key matching the file that defines it), because post-authoring the script scans the three new files into its own "existing" set. A corrected rerun that excludes the three candidate files from the existing scan printed `ZERO COLLISIONS — 16 new keys vs 103 existing keys`, exactly reproducing the plan's recorded output. Engine-level confirmation (`dist/rules/principles.js`): each of the 16 new keys posts to exactly one principle, and `termsMatchLookup('retri')` → `budget-retries` only while `termsMatchLookup('retry')` → `make-operations-idempotent` only (the deliberate `retry`/`retries` separation holds under the real stemmer).

**Note:** the author-side validator (`validate-principles.mjs`) is not present in the repo (same situation as batch 1); all structural checks were re-implemented independently. The three files are untracked working-tree additions at verification time.

## Blocking findings

1. **Appendix A collision script is non-idempotent — process finding, not a content defect.** Verbatim rerun output:

   ```
   COLLISION budget-retries-against-headroom retri -> retri (budget-retries-against-headroom.md)
   COLLISION budget-retries-against-headroom backoff -> backoff (budget-retries-against-headroom.md)
   COLLISION budget-retries-against-headroom jitter -> jitter (budget-retries-against-headroom.md)
   COLLISION budget-retries-against-headroom storm -> storm (budget-retries-against-headroom.md)
   COLLISION budget-retries-against-headroom amplification -> amplification (budget-retries-against-headroom.md)
   COLLISION budget-retries-against-headroom headroom -> headroom (budget-retries-against-headroom.md)
   COLLISION propagate-deadlines deadline -> deadline (propagate-deadlines.md)
   COLLISION propagate-deadlines cancellation -> cancellation (propagate-deadlines.md)
   COLLISION propagate-deadlines cascade -> cascade (propagate-deadlines.md)
   COLLISION propagate-deadlines propagation -> propagation (propagate-deadlines.md)
   COLLISION bound-queues-and-shed-overload queue -> queue (bound-queues-and-shed-overload.md)
   COLLISION bound-queues-and-shed-overload backlog -> backlog (bound-queues-and-shed-overload.md)
   COLLISION bound-queues-and-shed-overload backpressure -> backpressure (bound-queues-and-shed-overload.md)
   COLLISION bound-queues-and-shed-overload overload -> overload (bound-queues-and-shed-overload.md)
   COLLISION bound-queues-and-shed-overload saturation -> saturation (bound-queues-and-shed-overload.md)
   COLLISION bound-queues-and-shed-overload shedd -> shedd (bound-queues-and-shed-overload.md)
   16 collisions
   ```

   Every line is a key matching itself in its own file — `existing` is built from every `*.md` in `catalog/principles`, including the three new files, with no candidate exclusion. The script as written can never print `ZERO COLLISIONS` after authoring, regardless of content; the plan's "rerun after authoring" expectation cannot hold. Fix (the plan file is outside this pass's write scope): skip the three candidate filenames when building `existing`, e.g. `const CANDIDATES = new Set(['budget-retries-against-headroom.md','propagate-deadlines.md','bound-queues-and-shed-overload.md']); if (CANDIDATES.has(f)) continue;`. With that one-line correction the script prints `ZERO COLLISIONS — 16 new keys vs 103 existing keys`, matching the plan's pre-authoring output and proving the property the check exists to prove. The engine posting check independently confirms zero cross-postings. **The three principle files pass the collision property; the defect is in the plan's script / checklist step 2.**

2. No content-level blocking findings against the three files.

## Non-blocking overlap notes (cross-linked; decision spaces hold)

- `budget-retries-against-headroom` ↔ `make-operations-idempotent`: budget line 21 states the retry-safety precondition ("Retry only operations that are safe to repeat; a retried write without an idempotency key duplicates the effect"); idempotent owns the mechanism (idempotency keys, upserts, CAS, once-only records). Cross-linked in budget's See Also. Same accepted pattern as batch 1's boundary/illegal-states note.
- `budget-retries-against-headroom` ↔ `fix-root-causes`: fix-root line 18 ("Delete the symptom workarounds — defensive copies, retries, extra checks — once the producer is correct") governs retries as masking workarounds; budget governs designed retry policy for transient failures. Distinct triggers, no threshold conflict.
- `budget-retries-against-headroom` ↔ `propagate-deadlines`: complementary and cross-linked both ways (budget See Also line 39; deadlines See Also line 38) — load policy versus time budget. No duplicated decision space.
- `propagate-deadlines` ↔ `explain-the-number`: deadlines line 24 ("Record the budget arithmetic beside the numbers — caller budget, own work, hop allowance — so the values can be checked") applies explain-the-number's recording discipline to deadline arithmetic; the deadline-specific mechanics (derive from remaining budget, cross-hop propagation, cancellation propagation, stop-waiting vs stop-working, headroom) are deadlines' own. Cross-linked in See Also.
- `bound-queues-and-shed-overload` ↔ `separate-before-serializing-shared-state`: bound's See Also anticipates the adjacency ("partitioning bounds one queue's contention; the bound is still yours to set"); separate owns partitioning/ownership, bound owns buffer capacity and overflow policy. No contradiction — a per-key serialized queue still needs a bound.
- `bound-queues-and-shed-overload` ↔ `budget-retries-against-headroom`: shared fragment "alarm on the … not only on …" (trigram 0.015); distinct alarms (queue depth/drain trend vs retry amplification/error share).
- `never-block-on-the-human`: no decision-space contact found with any of the three files.
- **Stylistic echoes (non-blocking):** the three new files' See Also lines to `explain-the-number` share the "…constant(s) that need(s) a derivation" formula (budget line 38, deadlines line 37, bound line 38); budget line 4 uses British "behaviour" in a predominantly American catalog (repo-wide 789 "behavior" vs 14 "behaviour"; the execution plan's spec text also uses "behaviour").
- **Selection-mechanics observation (non-blocking):** the plan's trade-off note says tasks phrased only "add retry logic" or "set a timeout" will not select the new principles. Empirically the `apply_when` gate (weight 5, below keyword weight 10) does select them: `"add retry logic to the sender"` gate-hits budget-retries ('add', 'retry'), and `"set a timeout on the outbound call"` gate-hits propagate-deadlines ('call', 'outbound', 'timeout'). This is the engine working as designed (apply_when is the model-facing gate per contract §2), and the primary owners (`make-operations-idempotent`, `explain-the-number`) still rank first on their own keyword hits; the plan's note is just inaccurate about gate behavior. No action implied.

## Sources (fetched 2026-10-13, all HTTP 200)

| URL | Status | Cited for | Supported | Evidence from the page |
|---|---|---|---|---|
| `sre.google/sre-book/handling-overload/` | 200 | retry budgets / amplification | yes | "per-request retry budget of up to three attempts"; "per-client retry budget … below 10%"; "a threefold increase in requests is significant … reduces the growth to just 1.1x" |
| `aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/` | 200 | randomized backoff / jitter | yes | "we employ jitter. This is a random amount of time before making or retrying a request to help prevent large bursts by spreading out the arrival rate"; "retries can be ineffective if all clients retry at the same time" |
| `sre.google/sre-book/addressing-cascading-failures/` | 200 | deadlines / load shedding / cascading failures | yes | "Missed RPC deadlines … The work the server did to respond is then wasted, and clients may retry the RPCs, leading to even more overload"; "Load Shedding and Graceful Degradation"; chapter is on cascading failures |
| `grpc.io/docs/guides/deadlines/` | 200 | deadline propagation | yes | "Deadline Propagation … honor the deadline set by the original client. Automatically propagating the deadline from an incoming RPC to an outgoing one"; automatic cancellation on expiry; server responsible for stopping spawned activity |
| `aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/` | 200 | bounded queues / drain time | yes | "prevents queue backlogs from becoming unrecoverable, using backpressure, prioritization, and constant work to drain queues safely"; "scaling an inbound throttle limit (inversely) proportionally to backlog size"; "limits serve as guardrails for unexpected spikes". Page does not use the literal words "bounded"/"drain time"; the concepts are supported. |
| `aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/` | 200 | priority shedding | yes | "Prioritizing requests … triage incoming requests to decide which ones to accept and which ones to turn away"; "rejecting excess work early so the system keeps serving requests it can handle" |

## Depth over constitution (nearest axiom → mechanics the axiom lacks)

| id | nearest | added mechanics |
|---|---|---|
| budget-retries-against-headroom | P-04 no-silent-failures | per-caller/per-dependency retry budget as a share of calls; idempotency precondition; randomized per-attempt delay; attempt caps and amplification accounting; shed-vs-retry under saturation; amplification and retry-share alarms |
| propagate-deadlines | P-04 no-silent-failures | child deadline derived from the caller's remaining budget; cross-hop propagation; cancellation propagation; stop-waiting vs stop-working (abandoned work burns capacity); budget arithmetic recorded; headroom for the parent's post-processing |
| bound-queues-and-shed-overload | P-04 no-silent-failures | depth+memory bounds from a drain-time budget; overflow policy decided up front (priority shed / admission refusal / producer backpressure); backlog and drain-time measurement with trend alarms; cheap observable shed path; re-derivation triggers |

No principle restates an axiom: P-04 stops at "log or recover every failure", and none of the three files is about recovery logging — each adds systems-load mechanics absent from T0 and from the 22 prior principles (the first failure-mode/reliability entries in the catalog).

## Verdicts

| id | verdict | notes |
|---|---|---|
| budget-retries-against-headroom | verified | all checks pass; P-04 + retry-load mechanics; safety-precondition bullet shared with idempotent (cross-linked); `enforce: both` matches precedent |
| propagate-deadlines | verified | all checks pass; P-04 + deadline-budget mechanics; recording bullet shared with explain-the-number (cross-linked); gRPC "Deadline Propagation" cited |
| bound-queues-and-shed-overload | verified | all checks pass; P-04 + queue-bound/shed mechanics; bound-as-constant shared with explain-the-number (cross-linked); priority shedding cited |

## Counts

- **verified: 3/3** — status flipped `draft` → `verified`
- **rejected: 0/3**
- **blocking process finding: 1** — Appendix A script self-collision (non-idempotent); corrected rerun prints `ZERO COLLISIONS — 16 new keys vs 103 existing keys`; engine confirms one principle per new key
