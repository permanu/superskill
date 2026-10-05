---
id: cpp-perf-reserve-capacity
lang: cpp
prefix: perf
title: Reserve capacity before filling a container whose final size is known
severity: should
enforce: both
tool: clang-tidy:performance-inefficient-vector-operation
baseline: latest
status: verified
triggers:
  keywords: [reserve, vector, reallocation, capacity]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::vector, reserve]
related: [cpp-perf-contiguous-access, cpp-perf-measure-first]
sources:
  - title: clang-tidy - performance-inefficient-vector-operation
    url: https://clang.llvm.org/extra/clang-tidy/checks/performance/inefficient-vector-operation.html
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
---
> Call reserve when the final element count is known; growth reallocations are costly.

## Why

A vector that grows one `push_back` at a time reallocates whenever capacity is exhausted, copying or moving every element and invalidating all pointers and iterators. When the final size is known, `reserve` performs one allocation up front and eliminates the reallocation sequence entirely. The clang-tidy check `performance-inefficient-vector-operation` flags loops that grow a vector without reserving.

## Bad

```cpp
#include <vector>

std::vector<int> squares(int count) {
    std::vector<int> values;
    for (int i = 0; i < count; ++i)
        values.push_back(i * i); // repeated reallocation while growing
    return values;
}
```

## Good

```cpp
#include <vector>

std::vector<int> squares(int count) {
    std::vector<int> values;
    values.reserve(static_cast<std::size_t>(count)); // one allocation
    for (int i = 0; i < count; ++i)
        values.push_back(i * i);
    return values;
}
```

## See Also

- [cpp-perf-contiguous-access](perf-contiguous-access.md) - why contiguous storage is fast to traverse
- [cpp-perf-measure-first](perf-measure-first.md) - confirming the loop is hot before tuning it
