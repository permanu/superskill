---
id: cpp-lint-pedantic
lang: cpp
prefix: lint
title: Compile strict ISO mode in CI
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pedantic, extensions, iso]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-lint-warnings-enabled, cpp-lint-werror]
sources:
  - title: GCC - Options to Request or Suppress Warnings
    url: https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html
---
> -Wpedantic diagnoses the extensions a normal build accepts silently.

## Why

The GCC warning-options reference defines the option: -Wpedantic issues all the warnings demanded by strict ISO C and ISO C++, diagnosing all programs that use forbidden extensions; -pedantic-errors gives an error whenever the base standard requires a diagnostic. A compiler accepts many extensions by default, so code that builds locally can fail on another toolchain or standard mode. The strict build is the portability check that runs on every commit instead of on the customer's compiler.

## Bad

```cpp
int main() {
    int size = 3;
    int values[size]; // variable-length array: a compiler extension in C++
    values[0] = 1;
    return values[0] == 1 ? 0 : 1;
}
```

## Good

```cpp
#include <vector>

int main() {
    std::vector<int> values(3); // standard dynamic sizing
    values[0] = 1;
    return values[0] == 1 ? 0 : 1;
}
```

## See Also

- [cpp-lint-warnings-enabled](lint-warnings-enabled.md) - the standard warning sets
- [cpp-lint-werror](lint-werror.md) - stopping the build on findings
