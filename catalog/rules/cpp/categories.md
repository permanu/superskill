# C++ - Category Plan

Baseline: latest
Target total: 326 rules (~265)

## Prefixes

Shared core: `type, err, mem, api, async, conc, perf, test, doc, obs, sec, style, proj, lint, anti, data, num, conv, pat, macro, const, io, net, ui, ffi`.
C++ extensions declared here: `init` (initialization and construction), `raii` (RAII and resource management; this replaced the originally planned `own` extension, and no `own` rules exist), `ptr` (smart pointers and pointer discipline), `unsafe` (undefined behavior and dangerous constructs), `trait` (concepts, constraints, type traits), `tmpl` (templates and generic programming), `coll` (containers and algorithms), `str` (strings and text).

## Plan

Source numbers reference the Primary list in `sources.md`. Each batch fetches the primary sources for its own category before authoring.

| prefix | title | target | primary sources |
|---|---|---|---|
| anti | Anti-patterns | 7 | 8, 33, 134, 140, 171, 172, 173 |
| api | Interfaces and API design | 13 | 8, 25, 26, 27 |
| async | Async and coroutines | 9 | 8, 174, 175, 176, 177 |
| coll | Containers and algorithms | 12 | 8, 35, 118, 119, 120, 121, 122, 123, 124, 125 |
| conc | Concurrency and atomics | 13 | 8, 28, 29, 30, 31, 32, 64 |
| const | const-correctness and constant evaluation | 12 | 8, 45, 66, 117, 126, 127, 128, 129, 130, 131 |
| data | Data modeling and invariants | 4 | 8, 167, 178, 179 |
| doc | Documentation and comments | 12 | 8, 95, 96, 97, 98, 99, 107 |
| err | Error handling | 16 | 1, 3, 4, 5, 6, 7, 8, 9, 10, 11 |
| ffi | C interop and ABI | 12 | 8, 29, 36, 58, 113, 135, 136, 137, 138 |
| init | Initialization and construction | 9 | 8, 141, 165, 166, 167, 168, 169, 170 |
| io | I/O and filesystem | 12 | 57, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 93, 94 |
| lint | Build and lint tooling | 6 | 180, 181, 182, 183 |
| macro | Preprocessor and macros | 12 | 8, 107, 113, 114, 115, 116, 117 |
| mem | Memory management | 12 | 8, 35, 49, 50, 51, 52, 53, 65 |
| num | Numeric and arithmetic | 12 | 8, 100, 101, 102, 103, 104, 105, 106, 108 |
| obs | Observability and logging | 12 | 5, 9, 10, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63 |
| pat | Architecture patterns | 6 | 8, 26, 48, 169, 184 |
| perf | Performance | 12 | 8, 33, 34, 35, 36, 37, 38 |
| proj | Project structure and build | 12 | 8, 114, 132, 133, 134 |
| ptr | Smart pointers and pointer discipline | 10 | 8, 25, 26, 27, 147, 148, 149, 150 |
| raii | RAII and resource management | 13 | 8, 13, 15, 16, 17, 18, 24 |
| sec | Security | 12 | 35, 66, 67, 68, 69, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92 |
| str | Strings and text | 12 | 8, 30, 66, 72, 106, 109, 110, 111, 112 |
| style | Style and readability | 9 | 8, 126, 172, 185, 186, 187 |
| test | Testing | 12 | 8, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48 |
| tmpl | Templates and generic programming | 10 | 8, 151, 152, 153, 154, 155, 156, 157, 158 |
| trait | Concepts and type traits | 9 | 8, 159, 160, 161, 162, 163, 164 |
| type | Types and invariants | 12 | 8, 19, 20, 21, 22, 23 |
| unsafe | Undefined behavior and dangerous constructs | 12 | 8, 139, 140, 141, 142, 143, 144, 145, 146 |

## Batch status

- Batch 1: `err` - 16 rules authored, verified 16/16.
- Batch 2: `raii` - 13/13 verified; `type` - 12/12 verified.
- Batch 3: `api` - 13/13 verified; `conc` - 13/13 verified.
- Batch 4: `perf` - 12/12 verified; `test` - 12/12 verified.
- Batch 5: `mem` - 12/12 verified; `obs` - 12/12 verified.
- Batch 6: `sec` - 12/12 verified; `io` - 12/12 verified.
- Batch 7: `doc` - 12/12 verified; `num` - 12/12 verified.
- Batch 8: `str` - 12/12 verified; `macro` - 12/12 verified.
- Batch 9: `coll` - 12/12 verified; `const` - 12/12 verified (fixes re-checked).
- Batch 10: `proj` - 12/12 verified; `ffi` - 12/12 verified (fix re-checked).
- Batch 11: `unsafe` - 12/12 verified; `ptr` - 10/10 verified (fix re-checked).
- Batch 12: `tmpl` - 10/10 verified; `trait` - 9/9 verified.
- Batch 13: `init` - 9/9 verified; `anti` - 7/7 verified.
- Batch 14: `async` - 9 rules authored; `data` - 4 rules authored; `lint` - 6 rules authored; `pat` - 6 rules authored; `style` - 9 rules authored. One fix applied (`data-self-assignment` reworded to its deterministic demonstration), all `status: draft`.
- Prefix note: `raii` replaced the planned `own` extension (no `own` rules exist).
- Remaining targets: 0 rules (326 reached).
