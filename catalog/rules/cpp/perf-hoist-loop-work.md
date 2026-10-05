---
id: cpp-perf-hoist-loop-work
lang: cpp
prefix: perf
title: Hoist repeated work out of loop conditions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [loop, invariant, strlen, hoisting]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::strlen]
related: [cpp-perf-measure-first, cpp-perf-contiguous-access]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Compute loop-invariant values once, before the loop, instead of in the condition.

## Why

An expression in a loop condition is evaluated on every iteration. When that expression walks a sequence, as `strlen` does, an O(n) loop becomes O(n^2) with no visible signal in the code. Computing the value once before the loop preserves the algorithm's complexity and costs nothing; the guideline's own example rewrites exactly this pattern.

## Bad

```cpp
#include <cstring>

void lower(char* text) {
    for (std::size_t i = 0; i < std::strlen(text); ++i) // strlen on every iteration
        if (text[i] >= 'A' && text[i] <= 'Z')
            text[i] = static_cast<char>(text[i] - 'A' + 'a');
}
```

## Good

```cpp
#include <cstring>

void lower(char* text) {
    const std::size_t length = std::strlen(text); // computed once
    for (std::size_t i = 0; i < length; ++i)
        if (text[i] >= 'A' && text[i] <= 'Z')
            text[i] = static_cast<char>(text[i] - 'A' + 'a');
}
```

## See Also

- [cpp-perf-measure-first](perf-measure-first.md) - when hoisting is worth more than clarity
- [cpp-perf-contiguous-access](perf-contiguous-access.md) - the traversal pattern this protects
