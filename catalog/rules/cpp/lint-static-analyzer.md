---
id: cpp-lint-static-analyzer
lang: cpp
prefix: lint
title: Run a static analyzer on the build
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static-analysis, fanalyzer, paths]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-lint-clang-tidy, cpp-lint-werror]
sources:
  - title: GCC - Options That Control Static Analysis
    url: https://gcc.gnu.org/onlinedocs/gcc/Static-Analyzer-Options.html
  - title: clang-tidy - Checks
    url: https://clang.llvm.org/extra/clang-tidy/
---
> A path analyzer follows the interprocedural routes a warning cannot.

## Why

The GCC static-analysis reference describes -fanalyzer: it enables a static analysis of program flow that looks for interesting interprocedural paths and issues warnings for problems found on them — leaks, double frees, use after free, out-of-bounds accesses, null dereferences — while stating honestly that it is neither sound nor complete and is a bug-finding tool, not a proof of correctness. The clang-tidy check list carries the same analysis as clang-analyzer-* checks. Either way, the leak on the error path is exactly what a front-end warning misses.

## Bad

```cpp
#include <cstdlib>

int read_value(bool ok) {
    int* value = static_cast<int*>(std::malloc(sizeof(int)));
    if (!ok)
        return 0; // leaks the allocation
    *value = 42;
    const int result = *value;
    std::free(value);
    return result;
}

int main() {
    return read_value(true) == 42 ? 0 : 1;
}
```

## Good

```cpp
#include <memory>

int read_value(bool ok) {
    auto value = std::make_unique<int>(0);
    if (!ok)
        return 0; // the owner cleans up on every path
    *value = 42;
    return *value;
}

int main() {
    return read_value(true) == 42 ? 0 : 1;
}
```

## See Also

- [cpp-lint-clang-tidy](lint-clang-tidy.md) - the linter that carries the same checks
- [cpp-lint-werror](lint-werror.md) - the compiler-level baseline
