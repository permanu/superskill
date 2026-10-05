# C - Category Plan

Shared taxonomy plus two C extensions: `unsafe` (undefined behavior, object lifetime, and portability hazards) and `ptr` (pointers, aliasing, qualifiers, and object representation). The shared prefixes `async` and `ui` do not apply to C: signal handling lives under `conc`, terminals and user interaction under `io`.

Target: 265 rules. Source numbers refer to the numbered Primary list in `sources.md`.

**Status: complete** — all 265 rules authored across the 25 prefixes below.

| prefix | title | target | primary sources |
|---|---|---|---|
| anti | Anti-patterns | 12 | 3,9 |
| api | Public API and header design | 4 | 1,4 |
| conc | Concurrency, atomics, signals | 12 | 1,3 |
| const | const correctness and compile-time constants | 3 | 1,3 |
| conv | Conversions, promotions, narrowing | 12 | 1,4 |
| data | Data structures and algorithms | 12 | 3,9 |
| doc | Documentation and comments | 12 | 9 |
| err | Error handling and errno discipline | 15 | 4,5,6 |
| ffi | FFI and ABI boundaries | 12 | 1,6 |
| io | I/O, files, streams, terminals | 13 | 3,6 |
| lint | Static analysis and tooling | 12 | 7,9 |
| macro | Preprocessor and macros | 12 | 1,3 |
| mem | Memory management and lifetimes | 14 | 3,4 |
| net | Networking (POSIX sockets) | 2 | 5,6 |
| num | Numeric semantics and floating point | 12 | 1,3 |
| obs | Observability and logging | 12 | 4,9 |
| pat | Patterns (opaque types, vtables, arenas) | 12 | 3,9 |
| perf | Performance and optimization | 4 | 3,6 |
| proj | Build, packaging, project layout | 12 | 8,9 |
| ptr | Pointers, aliasing, qualifiers | 14 | 1,3 |
| sec | Security and hardening | 14 | 4,5 |
| style | Style and readability | 12 | 9 |
| test | Testing, fuzzing, sanitizers | 4 | 7,9 |
| type | Types, declarations, qualifiers | 6 | 1,3 |
| unsafe | Undefined behavior and portability | 16 | 1,4 |

Plan complete: 265/265 rules authored. Batches 1-8 verified; 9 `ffi` (12) and `lint` (12) mostly verified with 4 fixes in re-check; 10 `conc` (12) and `data` (12) in verification; 11 `api` (4), `const` (3), `net` (2), `perf` (4), `test` (4), `type` (6) complete the plan.
