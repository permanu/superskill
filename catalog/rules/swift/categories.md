# Swift - Rule Categories

Baseline: latest
Target: 279 rules (rebalanced from the original 265 to match the shipped pack)

The pack uses the shared prefix taxonomy plus three declared Swift-specific prefixes:

- `ui` - SwiftUI and Apple-platform UI semantics: state ownership, identity, lifecycle, accessibility.
- `conc` - Swift structured concurrency and isolation: actors, `Sendable`, global actors, data-race safety.
- `arc` - ARC and ownership: strong/weak/unowned relationships, capture semantics, reference cycles.

Source numbers in the table reference `sources.md`: 1-12 are Primary, 13+ are Further reading.

| prefix | title | target | primary sources |
|---|---|---|---|
| type | Types and modeling | 15 | 22, 29, 30, 4 |
| err | Error handling | 16 | 1, 3, 5, 6, 8 |
| mem | Memory and value lifetimes | 12 | 21, 63, 65, 67, 68 |
| arc | ARC and ownership | 12 | 20, 21, 38, 39, 40, 41 |
| api | API design | 16 | 4, 37 |
| async | Async APIs and await ergonomics | 12 | 2, 79-82 |
| conc | Structured concurrency and isolation | 13 | 24-28, 109 |
| perf | Performance | 12 | 59, 83-96 |
| test | Testing | 6 | 15, 25, 168 |
| doc | Documentation | 12 | 4, 76, 77, 78 |
| obs | Observability and logging | 12 | 10, 54, 55, 56 |
| sec | Security | 12 | 42, 44, 45, 51 |
| style | Style and conventions | 12 | 4, 18, 35, 59, 70-75 |
| proj | Project and packaging | 13 | 57, 60, 61, 37 |
| lint | Linting and formatting | 12 | 17, 18, 97-99 |
| anti | Anti-patterns | 11 | 3, 72, 100-108 |
| data | Data, Codable, persistence | 12 | 4, 110-117 |
| num | Numerics | 6 | 3, 118-122 |
| conv | Compatibility and migration | 6 | 37, 70, 123 |
| pat | Pattern matching and control flow | 4 | 70, 72 |
| macro | Macros | 6 | 23, 33 |
| const | Constants and configuration | 6 | 3, 58, 73, 108, 124-126 |
| io | File and I/O | 8 | 16, 114, 127-136 |
| net | Networking | 8 | 16, 137-145 |
| ui | SwiftUI and interface | 17 | 9, 13, 14, 146-163 |
| ffi | C, Objective-C, and platform interop | 8 | 8, 16, 47, 164-167 |

Total: 279

## Status

| prefix | authored | verified | notes |
|---|---|---|---|
| anti | 11 | 11 | batch 8, verified (one rule deduped into conc-actor-state) |
| api | 16 | 16 | batch 3, verified |
| arc | 12 | 12 | batch 3, verified |
| async | 12 | 12 | batch 7, verified |
| conc | 13 | 13 | batch 2, verified |
| const | 6 | 5 | batch 9; one fix (const-legacy-constant) applied, awaiting re-check |
| conv | 6 | 4 | batch 9; two fixes (conv-obsoleted, conv-preconcurrency-import) applied, awaiting re-check |
| data | 12 | 12 | batch 8, verified |
| doc | 12 | 12 | batch 6, verified |
| err | 16 | 16 | batch 1, verified |
| ffi | 8 | 0 | batch 11, draft |
| io | 8 | 8 | batch 10, verified |
| lint | 12 | 12 | batch 8, verified |
| macro | 6 | 0 | batch 11, draft |
| mem | 12 | 12 | batch 5, verified |
| net | 8 | 8 | batch 10, verified |
| num | 6 | 6 | batch 9, verified |
| obs | 12 | 12 | batch 4, verified |
| pat | 4 | 4 | batch 9, verified |
| perf | 12 | 12 | batch 7, verified |
| proj | 13 | 13 | batch 5, verified |
| sec | 12 | 12 | batch 4, verified |
| style | 12 | 12 | batch 6, verified |
| test | 6 | 0 | batch 11, draft (reduced from target 13; comment-only snippets) |
| type | 15 | 15 | batch 2, verified |
| ui | 17 | 0 | batch 11, draft |

Batch 6 adjusted the plan: `doc` target raised from 8 to 12 (documentation sources grew to include SwiftLint doc rules) and `pat` lowered from 8 to 4, since pattern-matching style landed in `style`. Batch 7 authored 12 `async` and 12 `perf` rules against targets of 11 and 10, matching the earlier over-delivery pattern of `mem`, `arc`, `obs`, and `proj`; plan targets are unchanged. Batch 8 authored 12 `lint`, 12 `anti`, and 12 `data` rules against targets of 6, 10, and 12; the `lint` overage is noted for rebalancing. Batch 8 verification deduped `anti-unchecked-sendable` into the already-covering `conc-actor-state` (SE-0302 rationale merged, `conc-actor-state` reset to draft for re-check). Batch 9 authored `num` (6), `conv` (6), `pat` (4), and `const` (6) at their plan targets. Batch 10 authored `io` (8) and `net` (8) at their plan targets; `ui` (17), `ffi` (8), `macro` (6), and `test` (13) remained. Batch 11 authored the remaining categories — `ui` (17), `ffi` (8), `macro` (6), and `test` (6, reduced from 13 because Testing and XCTest are not importable in the authoring environment, so its rules use comment-only snippets) — and the plan total was rebalanced from 265 to 279 to match the shipped pack: earlier batches over-delivered against `mem`, `arc`, `obs`, `proj`, `async`, `perf`, `lint`, and `anti`, while `type` (15) and `conc` (13) ran under their original targets and `test` was cut. Batch 9 verification passed 19 of 22 rules; three fixes were applied (`conv-obsoleted` now uses `@available(swift, obsoleted:)`, `conv-preconcurrency-import` now demonstrates a real `@preconcurrency import Foundation`, and `const-legacy-constant` was re-scoped to drop the false SDK-removal claim) and await re-check. Batch 10 `io` and `net` rules are verified.
