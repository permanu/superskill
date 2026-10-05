---
id: c-perf-restrict-hot-loops
lang: c
prefix: perf
title: Add restrict to hot loops whose buffers never alias
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [restrict, vectorization, aliasing, hot loop]
  files: ["**/*.c", "**/*.h"]
  symbols: [restrict]
related: [c-ptr-restrict-contract, c-perf-optimize-release]
sources:
  - title: cppreference - restrict type qualifier
    url: https://en.cppreference.com/w/c/language/restrict
---
> Promise non-aliasing on hot array functions when the contract truly excludes overlap.

## Why

cppreference describes the restrict qualifier as the programmer's promise that accesses through the pointer are not aliased during the block, which frees the compiler to reorder and vectorize. Without it, the compiler must assume every store through one pointer may affect the other and emits scalar code with reloads. The promise is only valid where the API already forbids overlapping buffers.

## Bad

```c
#include <stddef.h>

void add_arrays(int *dst, const int *src, size_t n) {
    for (size_t i = 0; i < n; ++i) {
        dst[i] += src[i];   /* the compiler must assume dst and src may alias */
    }
}
```

## Good

```c
#include <stddef.h>

void add_arrays(int *restrict dst, const int *restrict src, size_t n) {
    for (size_t i = 0; i < n; ++i) {
        dst[i] += src[i];   /* the promise enables vectorization */
    }
}
```

## See Also

- [c-ptr-restrict-contract](ptr-restrict-contract.md) - when the promise must not be made
- [c-perf-optimize-release](perf-optimize-release.md) - the optimization level that uses it
