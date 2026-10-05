# Go - Categories

Rule plan for the Go pack. Targets sum to 265 for parity with the rust-skills pack. Source numbers refer to `sources.md`.

Go extensions to the shared taxonomy (declared here per contract section 6): `gen` (generics), `iface` (interfaces and embedding), `mod` (modules and tooling).

| prefix | title | target | primary sources |
|---|---|---|---|
| err | Error handling | 16 | 5,8,9,20 |
| conc | Concurrency | 16 | 1,2,6,10,21,22,23,24 |
| mem | Memory and allocations | 14 | 1,3,12,34,35,36,37,38,39,40 |
| api | API and package design | 15 | 1,2,8,19,27,28,29 |
| iface | Interfaces and embedding | 12 | 1,2,3,11,25,26 |
| gen | Generics | 9 | 11,34,36,57 |
| type | Types and zero values | 8 | 1,34,66 |
| style | Naming and code style | 16 | 2,4,19,27 |
| test | Testing and benchmarks | 16 | 2,13,15,30,31,32,33 |
| perf | Performance and profiling | 13 | 1,12,13,36,41,42,43,44,47,48 |
| anti | Anti-patterns and folklore | 10 | 1,2,6,20,34,47,59 |
| mod | Modules and tooling | 14 | 14,63 |
| proj | Project layout | 8 | 14,19,20,63 |
| obs | Observability and logging | 10 | 7,20,41,42,43,44,45,46 |
| sec | Security | 12 | 2,12,13,47,48,49,50,51,52,53,54,55,56 |
| lint | Static analysis and tooling | 10 | 5,6,7,13,16,21,47,48 |
| data | Data and encoding | 12 | 12,48,58,59 |
| io | I/O and streams | 7 | 1,25 |
| net | Networking and HTTP | 10 | 18,47 |
| num | Numeric types and constants | 6 | 34,59,65 |
| conv | Conventions and idioms | 5 | 1,20 |
| pat | Design patterns | 7 | 20,24,47 |
| const | Constants and enums | 6 | 34 |
| doc | Documentation and comments | 6 | 4,27 |
| ui | CLI and terminal UX | 3 | 62,67 |
| ffi | cgo and FFI | 3 | 34,68 |

## Notes

- Total: 264 targets across 26 prefixes (the original 265-target plan lost one duplicate io rule during verification).
- Categories not applicable to Go: `async` (no async/await; concurrency lives in `conc`) and `macro` (no macros; generics live in `gen`, code generation lives in `mod`).
- Batch status: all 264 planned rules are authored. `err` 16 (16 verified); `conc` 16 (16 verified); `iface` 12 (11 verified, 1 pending re-verification after merge); `api` 15 (15 verified); `test` 16 (16 verified); `style` 16 (16 verified); `mem` 14 (14 verified); `perf` 13 (13 verified); `obs` 10 (10 verified); `sec` 12 (12 verified); `lint` 10 (10 verified); `gen` 9 (9 verified); `data` 12 (12 verified); `anti` 10 (10 verified); `proj` 8 (8 verified); `doc` 6 (6 verified); `num` 6 (6 verified); `mod` 14 (14 verified); `type` 8 (8 verified); `io` 7 (7 verified); `net` 10 (10 verified); `conv` 5 (5 verified); `pat` 7 (7 verified); `const` 6 (6 verified); `ui` 3 (3 verified); `ffi` 3 (2 verified, 1 pending re-verification after snippet fix). Two rules remain draft pending verification.
