# Java - Rule Categories

Baseline: latest. Target: ~265 atomic rules, comparable to the rust-skills pack.

Shared taxonomy is used where it applies. Java declares four extensions: `gen` (generics), `opt` (Optional and null safety), `coll` (collections), `ann` (annotations and reflection). `macro` is not applicable (Java has no macros) and `ui` is out of scope for this pack (desktop toolkits are not covered), so both keep 0 targets.

Source numbers refer to `sources.md`.

| prefix | title | target | primary sources |
|---|---|---|---|
| err | Error handling | 16 | 1,2,8,9,10,11,12 |
| type | Types and data modeling | 18 | 1,2,4,5 |
| pat | Pattern matching | 4 | 6,24,25 |
| gen | Generics | 12 | 1,93-101 |
| opt | Optional and null safety | 12 | 1,11,102 |
| api | Public API design | 14 | 1,2,4,5 |
| coll | Collections | 12 | 1,38,74,88,108-112,164,165 |
| conc | Concurrency and virtual threads | 20 | 1,3,7,16,18 |
| async | Asynchronous composition | 13 | 1,18,120 |
| mem | Memory and GC | 12 | 1,83-92 |
| perf | Performance | 12 | 1,64-75 |
| io | I/O and resources | 12 | 1,13,76-82 |
| net | Networking | 5 | 1,19,143,144 |
| data | Data access | 7 | 139-142 |
| num | Numbers and arithmetic | 12 | 1,103-107 |
| conv | Conversions | 5 | 38,102,106,109 |
| const | Constants and immutability | 4 | 8,103,106,163 |
| ann | Annotations and reflection | 5 | 114,135-138 |
| test | Testing | 16 | 1 |
| doc | Documentation | 12 | 8,22 |
| obs | Observability | 12 | 1,17 |
| sec | Security | 16 | 1,3 |
| style | Style and formatting | 12 | 8 |
| lint | Static analysis and tooling | 12 | 12,106,121-130 |
| proj | Build, dependencies, and modules | 12 | 1,3,90,113-119,131 |
| anti | Anti-patterns | 12 | 8,124,150-159 |
| ffi | Native interop (FFM) | 4 | 145-147 |
| macro | Macros (not applicable) | 0 | - |
| ui | Desktop UI (out of scope) | 0 | - |

Targets sum to 303.

## Status

- err - 16/16 authored, 16/16 verified.
- type - 18/18 authored, 18/18 verified.
- pat - 4/4 authored (batch 11), 4/4 verified.
- conc - 20/20 authored, 20/20 verified.
- api - 14/14 authored, 14/14 verified.
- test - 16/16 authored, 16/16 verified.
- sec - 16/16 authored, 14/16 verified.
- obs - 12/12 authored, 12/12 verified.
- perf - 12/12 authored, 12/12 verified.
- io - 12/12 authored, 12/12 verified.
- mem - 12/12 authored, 12/12 verified.
- doc - 12/12 authored, 12/12 verified.
- gen - 12/12 authored (batch 7), 12/12 verified.
- opt - 12/12 authored (batch 7), 12/12 verified.
- num - 12/12 authored (batch 8), 12/12 verified.
- coll - 12/12 authored (batch 8), 12/12 verified.
- proj - 12/12 authored (batch 9), 12/12 verified.
- style - 12/12 authored (batch 9), 12/12 verified.
- lint - 12/12 authored (batch 10), 12/12 verified.
- async - 13/13 authored (batch 10), 13/13 verified.
- ann - 5/5 authored (batch 11), 5/5 verified.
- data - 7/7 authored (batch 11), 6/7 verified.
- net - 5/5 authored (batch 11), 4/5 verified.
- conv - 5/5 authored (batch 11), 5/5 verified.
- const - 4/4 authored (batch 11), 4/4 verified.
- anti - 12/12 authored (batch 11), 12/12 verified.
- ffi - 4/4 authored (batch 11), 3/4 verified.

All planned categories are authored; the 303-rule plan is complete.
