---
id: c-lint-clang-tidy
lang: c
prefix: lint
title: Run clang-tidy with the bugprone and cert check groups
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [clang-tidy, bugprone, cert, checks]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-lint-gcc-analyzer, c-lint-cppcheck]
sources:
  - title: Clang - clang-tidy
    url: https://clang.llvm.org/extra/clang-tidy/
---
> Select check groups in a checked-in configuration and run clang-tidy in CI.

## Why

clang-tidy's documentation describes an extensible check framework with named groups selected by globs, including the `bugprone` and `cert` families, and notes it can run the static analyzer's checks as well. A checked-in configuration makes the selection reproducible instead of depending on defaults that change between releases. In CI it catches interface misuse and suspicious constructs that compiler warnings do not model.

## Bad

```c
int classify(int value) {
    if (value > 0) {
        return 1;
    } else {
        return 1;   /* identical branches: bugprone-branch-clone */
    }
}
```

## Good

```c
int classify(int value) {
    if (value > 0) {
        return 1;
    }
    return 0;
}
```

## See Also

- [c-lint-gcc-analyzer](lint-gcc-analyzer.md) - the GCC path-analysis counterpart
- [c-lint-cppcheck](lint-cppcheck.md) - a compiler-independent second opinion
