---
id: c-lint-gcc-analyzer
lang: c
prefix: lint
title: Run GCC's fanalyzer for path-sensitive diagnostics
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fanalyzer, gcc, path analysis, double free]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-lint-clang-tidy, c-proj-static-analysis]
sources:
  - title: GCC - Options That Control Static Analysis
    url: https://gcc.gnu.org/onlinedocs/gcc/Static-Analyzer-Options.html
---
> Build with `-fanalyzer` in CI and act on the per-check warnings it enables.

## Why

GCC's static analyzer options document `-fanalyzer` and the warning families it enables, such as use-after-free, double free, and division by zero, each tracked along paths that single-expression warnings miss. The analyzer stops exploring silently when the code is too complex, and `-Wanalyzer-too-complex` is disabled by default, so enable that warning explicitly to distinguish silence from truncation. Running the analyzer on the build catches defects that depend on control flow.

## Bad

```c
#include <stdlib.h>

void release_twice(int *p) {
    free(p);
    free(p);   /* -fanalyzer tracks the double free */
}
```

## Good

```c
#include <stdlib.h>

void release_once(int **p) {
    free(*p);
    *p = NULL;   /* the owner forgets the block */
}
```

## See Also

- [c-lint-clang-tidy](lint-clang-tidy.md) - the clang-side check framework
- [c-proj-static-analysis](proj-static-analysis.md) - running the clang analyzer in CI
