# TypeScript - Category Plan

Shared taxonomy plus one declared TypeScript extension: `mod` (ECMAScript modules, imports/exports, and package boundaries). The shared `macro` prefix does not apply: TypeScript has no macro system, and decorators are covered under `api`, `pat`, and `lint`. The shared `mem` prefix is scoped to JavaScript memory behavior (WeakMap/WeakRef, listener and closure retention) rather than manual allocation.

Target: 259 rules, all authored (rebalanced from the original 265 during authoring: `async` and `type` shipped below their original estimates, `proj` was reduced to the enforceable tsconfig decisions, `const` was reduced after deduplication, and the freed slots moved among `conc`, `conv`, `io`, and `num`). Source numbers refer to the numbered Primary list in `sources.md`.

| prefix | title | target | primary sources |
|---|---|---|---|
| anti | Anti-patterns | 12 | 4, 5, 6 |
| api | API design | 16 | 1, 4, 11 |
| async | Asynchronous code and promises | 14 | 4, 6, 7, 8, 12, 13 |
| conc | Concurrency and the event loop | 12 | 6, 8, 9, 12 |
| const | Constants and immutability | 7 | 1, 4, 6, 11 |
| conv | Conversions and coercion | 9 | 5, 6, 11 |
| data | Data modeling and serialization | 12 | 1, 6, 18, 19 |
| doc | Documentation and comments | 6 | 1, 11, 20 |
| err | Error handling | 15 | 4, 5, 6, 7, 8, 9, 10 |
| ffi | Interop (WASM, Node-API, untyped JS) | 6 | 6, 9 |
| io | I/O, files, and streams | 9 | 8, 9 |
| lint | Linting, formatting, and type checking | 12 | 4, 5 |
| mem | Memory and lifetimes | 7 | 6, 8 |
| mod | Modules and packages | 12 | 2, 3, 6, 9, 11 |
| net | Networking and HTTP clients | 7 | 8, 10 |
| num | Numerics | 9 | 6 |
| obs | Observability and logging | 6 | 5, 8, 17 |
| pat | Patterns and control flow | 8 | 1, 6 |
| perf | Performance | 12 | 1, 6, 8, 15 |
| proj | Project and build configuration | 7 | 2 |
| sec | Security | 13 | 6, 8, 9, 10, 16, 17 |
| style | Style and conventions | 12 | 4, 5, 11 |
| test | Testing | 12 | 1, 9, 14 |
| type | Types and modeling | 16 | 1, 2 |
| ui | DOM and UI typing | 8 | 8 |

Total: 265

## Batches

Batch 1: `err` (15 rules), verified. Batch 2: `type` (16) and `async` (14), verified. Batch 3: `test` (12) and `perf` (12), verified. Batch 4: `api` (16) and `sec` (13), verified. Batch 5: `mod` (12) and `lint` (12), verified. Batch 6: `anti` (12) and `style` (12), verified. Batch 7: `data` (12) and `proj` (7), verified. Batch 8: `conc` (12), `const` (7), and `conv` (9), verified. Batch 9: `io` (9), `num` (9), and `pat` (8), verified. Batch 10: `doc` (6), `ffi` (6), `mem` (7), `net` (7), `obs` (6), and `ui` (8), verified except five reworked rules pending re-check (`doc-example`, `ffi-wasm-imports-object`, `ffi-wasm-instantiate-error`, `net-retry-after`, `ui-passive-listener`). All 259 planned rules are authored; the plan is complete.
