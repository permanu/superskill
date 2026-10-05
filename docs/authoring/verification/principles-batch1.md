# Principles Batch 1 — Adversarial Verification

**Date:** 2026-10-05
**Verifier:** independent adversarial pass (fresh context; did not author the files)
**Contract:** `docs/authoring/PRINCIPLES.md` v1.0 · **Parent:** `catalog/constitution.md`
**Scope:** all 22 files in `catalog/principles/`
**Result:** verified **20/22** (status flipped) · rejected **2/22** (left `draft`)

## Method

1. **Structural.** Author validator (`validate-principles.mjs`) ran clean — no problems, no warnings. An independent script re-checked: id/filename match, required frontmatter, `apply_when` prefix, keywords 2–8, `enforce` in review/both, section order, summary ≤25 words, Patterns 3–8, Tests 3–6, See Also resolution, `related` resolution, forbidden tokens, unicode ellipsis.
2. **Checkability.** All 88 Tests bullets read as a batch: every question asks about an artifact, command, count, state, or recorded decision available in the task. All end in `?`; no feelings/process-theater questions.
3. **Originality.** All bodies read; no upstream marketing text, no filler tokens (robust/seamless/best-practice/leverage/etc.), no placeholders. The canonical phrase “Make illegal states unrepresentable” appears only as the cited term-of-art title (Minsky, URL verified live; the post contains no prose copied into the file).
4. **Sources.** All 6 cited URLs fetched → HTTP 200: Jane Street Effective ML, Parse don’t validate, Fowler UbiquitousLanguage, RFC 9110, Fowler Mocks Aren’t Stubs, Fowler ParallelChange. Source claims match the cited pages.
5. **Overlap.** title+summary Jaccard scan (≥0.35: none); Patterns trigram scan (top pair 0.10); every semantic adjacency adjudicated by decision space (below).
6. **Depth.** Nearest constitution axiom named for every principle; added mechanics confirmed (table below).

**Note:** the author’s overlap report was not present in the repo (checked `docs/authoring/`, `workstreams/`, and the temp workspace). The splits were verified independently from the files; this is a process note, not a defect in the artifacts.

## Blocking findings

1. **`laziness-protocol` — rejected.** Line 17 (“generalize when the third real case appears”) and `subtract-before-you-add.md` line 17 (“inline the logic until a second real caller appears”) govern the same decision — when to abstract — with contradictory thresholds: at the second caller, one permits the abstraction the other defers. The “third” also conflicts with the catalog’s established convention (`go-iface-not-premature`, verified: extract when a real consumer appears). Fix: keep the abstraction gate in `subtract-before-you-add` and drop or rescope this bullet.
2. **`subtract-before-you-add` — rejected.** Line 19 (“Delete dead code, unused flags, and stale comments on contact”) mandates out-of-scope edits, contradicting T0 P-03 `smallest-change` (“change only what the task requires”) and the file’s own Test 4 (“Is any code in the diff unrelated to the task?”), which would flag the very diff the bullet produces. Fix: scope to dead code the change orphans (“dead code your change makes dead”).

## Non-blocking overlap notes (cross-linked; decision spaces hold)

- `make-illegal-states-unrepresentable` ↔ `type-system-discipline`: absence-as-optional/sum-type bullet is the closest textual pair (trigram 0.10); distinct decision spaces (state representation vs checker-enforced distinctions).
- `make-illegal-states-unrepresentable` ↔ `boundary-discipline`: “runtime validation only where values enter” restates boundary’s core; boundary owns the parse point, the constructor consequence is cross-linked.
- `fix-root-causes` ↔ `encode-lessons-in-structure`: regression-test-at-lowest-layer pair (0.09); repair vs permanent guard, cross-linked.
- Other adjacencies (evidence/sequence, migrate/sequence, outcome/laziness, model/minimize, test-behavior/encode, guard/sequence) all state distinct decisions and cross-reference correctly.
- Hedging notes, non-blocking per prior art (`cpp-batch13`): “usually” in `fix-root-causes` line 16 and `redesign-from-first-principles` See Also; “rather than”/“try to kill” are contrast/falsification phrasing, not hedges.

## Depth over constitution (nearest axiom → mechanics the axiom lacks)

| id | nearest | added mechanics |
|---|---|---|
| attack-the-premise | P-06 | falsifier per premise; cheapest observation first; goal vs mechanism; null option |
| boundary-discipline | P-02 | boundary enumeration; parse-once into typed values; single entry point; adapters translation-only; typed partial reads |
| encode-lessons-in-structure | P-05 | one machine guard per incident; lowest-layer placement; fix the class; link + retire stale guards |
| evidence-hierarchy | P-01 | evidence ranking; command/revision/observed-line quoting; current-revision rule; weak-labeling; negative-claim searches |
| exhaust-the-design-space | P-07 | ≥3 mechanism-different options; named axes; elimination reasons; recorded losers |
| explain-the-number | P-10 | unit-in-name; derivation; both-sides failure; single source; revisit trigger |
| fix-root-causes | P-04 | smallest reproduction; first-divergence trace; owner-layer fix; workaround deletion; sibling sweep |
| guard-the-context-window | P-11 | artifact persistence; bounded output; smallest-region reads; re-read after interruption; unit-boundary summaries |
| make-illegal-states-unrepresentable | P-02 | illegal-combination enumeration; tagged unions; smart constructor; lifecycle transitions; typed absence |
| make-operations-idempotent | P-04 | duplicate-behavior question; idempotency key stored with the effect; upsert/CAS; once-only side-effect records |
| migrate-callers-then-delete | P-03 | parallel add; caller enumeration incl. non-code artifacts; expand/migrate/contract; owner + removal trigger |
| minimize-reader-load | P-12 | unindented main path; one abstraction level; intent naming; top-down order; comment hygiene; no surprises |
| model-the-domain | P-11 | domain vocabulary adoption; one name per concept; written state machine; model-layer rules; mechanical rename |
| never-block-on-the-human | P-06 | evidence before asking; batched options + recommendation; reversible-choice rule; unblocked-work continuation; resumable artifacts |
| outcome-oriented-execution | P-01 | observable done definition; activity mapping; scope re-check; stop-at-done |
| redesign-from-first-principles | P-03 | obligations without implementation; requirement/accident/history; boundary-first; strangler migration |
| separate-before-serializing-shared-state | P-07 | contention measurement; partition-by-key ownership; immutability/events; narrow named locks; documented critical sections |
| sequence-verifiable-units | P-05 | pre-defined unit check; coherent boundaries; vertical slices; mechanical/behavioral split |
| test-behavior-not-implementation | P-05 | public-entry testing; outcomes not call order; external-boundary fakes only; refactor-survival rewrite rule |
| type-system-discipline | P-02 | primitive wrapping; exhaustiveness with loud fallback; confined casts; typed absence; review-rule-to-type rule |
| laziness-protocol (rejected) | P-03 | named triggers; last-responsible-moment; stub behind interface; no deferral of verification |
| subtract-before-you-add (rejected) | P-03 | delete/reuse/configure first; both-direction diff; stdlib over dependency; smallest fitting seam |

No principle merely restates an axiom: the closest case, `boundary-discipline`, mirrors P-02 in its summary but adds eight concrete moves (parsed value vs boolean, single entry point, adapter scope, typed stream incompleteness, malformed-input tests).

## Verdicts

| id | verdict | notes |
|---|---|---|
| attack-the-premise | verified | all checks pass; P-06 + falsification mechanics |
| boundary-discipline | verified | all checks pass; P-02 elaboration with 8 moves; shares entry-validation bullet with illegal-states (cross-linked) |
| encode-lessons-in-structure | verified | all checks pass; regression-guard overlap with fix-root (cross-linked) |
| evidence-hierarchy | verified | all checks pass; P-01 elaboration |
| exhaust-the-design-space | verified | all checks pass; distinct from redesign (new vs existing design) |
| explain-the-number | verified | all checks pass; P-10 applied to constants |
| fix-root-causes | verified | all checks pass; “usually” noted, non-blocking |
| guard-the-context-window | verified | all checks pass; P-11 applied to interruption/resume |
| make-illegal-states-unrepresentable | verified | all checks pass; canonical title cited to Minsky; absence bullet shared with type-system (cross-linked) |
| make-operations-idempotent | verified | all checks pass; RFC 9110 cited; distinct from migrate/separate |
| migrate-callers-then-delete | verified | all checks pass; ParallelChange cited |
| minimize-reader-load | verified | all checks pass; distinct from model (reader load vs domain vocabulary) |
| model-the-domain | verified | all checks pass; UbiquitousLanguage cited |
| never-block-on-the-human | verified | all checks pass; consistent with P-06 (ask once, then proceed) |
| outcome-oriented-execution | verified | all checks pass; distinct from evidence (done definition vs evidence ranking) |
| redesign-from-first-principles | verified | all checks pass; “usually” in See Also noted, non-blocking |
| separate-before-serializing-shared-state | verified | all checks pass; no constitution conflict (concurrency not covered by T0) |
| sequence-verifiable-units | verified | all checks pass; unit-check overlap with evidence (cross-linked) |
| subtract-before-you-add | **rejected** | line 19 “delete dead code on contact” contradicts P-03 and own Test 4; scope to orphaned code |
| test-behavior-not-implementation | verified | all checks pass; Mocks Aren’t Stubs cited |
| type-system-discipline | verified | all checks pass; absence bullet shared with illegal-states (cross-linked) |
| laziness-protocol | **rejected** | line 17 third-case threshold conflicts with subtract’s second-caller threshold; align or rescope |

## Counts

- **verified: 20/22** — status flipped `draft` → `verified`
- **rejected: 2/22** — `laziness-protocol`, `subtract-before-you-add` (left `draft`)

---

## Addendum — re-verification of the two rejected principles (2026-10-05)

Both author fixes were re-checked in full; this section supersedes the `Result` line and the two rejected rows above.

**`subtract-before-you-add`** — line 19 is now change-scoped: “Delete code, flags, and comments that this change orphans — a caller removed, a path made unreachable — instead of leaving them behind.” Orphan deletion is required by the change, so the P-03 `smallest-change` conflict and the Test 4 (“unrelated to the task”) conflict are both resolved. Line 17 still owns the abstraction gate (“until a second real caller appears”), matching verified `go-iface-not-premature`. Schema, tests, wording, and links unchanged and clean. **verified.**

**`laziness-protocol`** — line 17 is now threshold-free build deferral: “Build the concrete case first; build the general mechanism only when a real requirement demands it, not to cover imagined cases.” The abstraction threshold now lives only in `subtract-before-you-add`, so the sibling contradiction is resolved and the deferral posture composes with it. Targeted trigram scan of both new bullets against all 21 siblings: no overlap >0.1. Schema, tests, wording, and links unchanged and clean. **verified.**

### Final counts

- **verified: 22/22**
- **rejected: 0/22**
