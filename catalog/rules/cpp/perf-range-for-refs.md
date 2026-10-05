---
id: cpp-perf-range-for-refs
lang: cpp
prefix: perf
title: Iterate with references in range-for loops to avoid per-element copies
severity: should
enforce: both
tool: clang-tidy:performance-for-range-copy
baseline: latest
status: verified
triggers:
  keywords: [range-for, copy, reference, iteration]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [auto, std::vector]
related: [cpp-perf-contiguous-access, cpp-perf-sink-move]
sources:
  - title: clang-tidy - performance-for-range-copy
    url: https://clang.llvm.org/extra/clang-tidy/checks/performance/for-range-copy.html
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Bind range-for elements by reference; auto without & copies every non-trivial element.

## Why

`for (auto element : container)` copies each element, and for strings, containers, or any type with an expensive copy that is a hidden allocation per iteration. A const reference makes the loop read the element in place with no copy; a non-const reference is needed only when the element is modified. The clang-tidy check `performance-for-range-copy` flags loops whose variable is copied although a const reference would suffice.

## Bad

```cpp
#include <string>
#include <vector>

int total_length(const std::vector<std::string>& words) {
    int total = 0;
    for (auto word : words) // copies every string
        total += static_cast<int>(word.size());
    return total;
}
```

## Good

```cpp
#include <string>
#include <vector>

int total_length(const std::vector<std::string>& words) {
    int total = 0;
    for (const auto& word : words) // no copies
        total += static_cast<int>(word.size());
    return total;
}
```

## See Also

- [cpp-perf-contiguous-access](perf-contiguous-access.md) - traversal order over the same storage
- [cpp-perf-sink-move](perf-sink-move.md) - when a copy is genuinely needed
