# Python - Category Plan

Baseline: latest

Target total: ~287 rules (rust-skills parity).

Numbers in the primary sources column refer to `sources.md`. Categories whose dedicated stdlib pages are not yet pinned there name the page to add when that batch is authored; batch authors extend `sources.md` and fetch every added URL.

Declared language extension: `pkg` (packaging, dependencies, environments). All other prefixes are from the shared taxonomy.

Batch status: plan complete, 287/287 rules authored. Verified: 286. In verification: `num-math-fsum` (1 fix).

| prefix | title | target | primary sources |
|---|---|---|---|
| type | Type system and annotations | 28 | 5, 14, 15, 16, 17, 22, 31, 32, 37, 38, 76, 77, 132 |
| err | Error handling | 16 | 2, 3, 4, 7, 8, 9, 10, 18, 20, 21, 30 |
| async | Asyncio and structured concurrency | 20 | 6, 13, 7, 3, 33, 34, 35, 36, 39, 81 |
| conc | Threads, processes, interpreters | 13 | 26, 27, 22, 23, 121, 122 |
| perf | Performance and profiling | 17 | 1, 19, 27, 22, 40, 41, 42, 43, 44, 45, 46, 47, 127, 129 |
| test | Testing | 17 | 28, 12, 48, 49, 50, 51 |
| pkg | Packaging, dependencies, environments | 15 | 24, 1, 112, 113, 114, 115, 116, 117, 118, 119, 120 |
| api | API and library design | 13 | 5, 12, 4, 42, 83, 86, 87, 89, 90, 92, 93, 94, 95, 98 |
| anti | Anti-patterns | 14 | 19, 12, 88, 90, 91, 96, 97, 99, 100, 101, 102 |
| style | Style and readability | 13 | 12, 1, 19, 88 |
| doc | Documentation | 12 | 12, 5, 88, 90, 110, 111 |
| obs | Observability and logging | 13 | 11, 10, 9, 66, 67, 68, 69, 70 |
| sec | Security | 15 | 19, 25, 52, 53, 54, 55, 56, 57, 58, 65, 85, 126, 131 |
| data | Data handling | 14 | 1, 29, 58, 59, 60, 61, 62, 63, 64, 65 |
| io | Files, paths, streams | 12 | 29, 4, 1, 84, 85, 86, 87 |
| num | Numbers and floats | 6 | 1, 60, 123, 124, 125 |
| mem | Memory and resources | 12 | 4, 3, 78, 79, 80, 81, 82, 83 |
| proj | Project layout and tooling | 12 | 24, 19, 71, 72, 73, 74, 75 |
| lint | Static analysis and typing configuration | 12 | 19, 5, 103, 104, 105, 106, 107, 108, 109 |
| const | Constants and configuration | 5 | 1, 5, 42, 86, 88, 126, 128 |
| pat | Composition and design patterns | 8 | 5, 12, 42, 59, 90, 92, 130 |
