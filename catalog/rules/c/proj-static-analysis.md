---
id: c-proj-static-analysis
lang: c
prefix: proj
title: Run the static analyzer over the build in CI
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static analyzer, scan-build, CI, path analysis]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-sanitizers, c-proj-warning-level]
sources:
  - title: Clang - Clang Static Analyzer
    url: https://clang.llvm.org/docs/ClangStaticAnalyzer.html
---
> Run the path-sensitive analyzer in CI and fix what it reports; compiler warnings are not enough.

## Why

The compiler checks one expression at a time, so a null dereference that only occurs on one control-flow path, or a value that is uninitialized on an error branch, passes `-Wall` untouched. The static analyzer explores the paths and reports them with a trace. Running it on every build keeps those defects from depending on someone remembering to look.

## Bad

```c
#include <stddef.h>

int read_or_default(int *value) {
    if (value == NULL) {
        return *value;   /* null dereference: analyzer finds, compiler does not */
    }
    return *value;
}
```

## Good

```c
#include <stddef.h>

int read_or_default(const int *value) {
    if (value == NULL) {
        return -1;
    }
    return *value;
}
```

## See Also

- [c-proj-sanitizers](proj-sanitizers.md) - the runtime counterpart for bugs analysis cannot see
- [c-proj-warning-level](proj-warning-level.md) - the compiler diagnostics this supplements
