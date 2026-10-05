---
id: cpp-perf-contiguous-access
lang: cpp
prefix: perf
title: Traverse memory linearly over contiguous storage in hot loops
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cache, locality, matrix, traversal]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::vector]
related: [cpp-perf-reserve-capacity, cpp-perf-compact-hot-data]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
---
> Walk arrays and vectors in address order; strided traversal defeats cache prefetching.

## Why

Cache algorithms favor simple, linear access to adjacent data, so a loop that steps across rows touches a new cache line on every iteration while a row-major loop uses each loaded line completely. The same data structure can be several times slower depending on traversal order alone. Contiguous containers make the linear order the natural one; choosing it is free.

## Bad

```cpp
constexpr int rows = 64;
constexpr int cols = 64;

int sum_column_major(const int matrix[rows][cols]) {
    int sum = 0;
    for (int c = 0; c < cols; ++c)
        for (int r = 0; r < rows; ++r)
            sum += matrix[r][c]; // strides across rows: a new line per step
    return sum;
}
```

## Good

```cpp
constexpr int rows = 64;
constexpr int cols = 64;

int sum_row_major(const int matrix[rows][cols]) {
    int sum = 0;
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c)
            sum += matrix[r][c]; // linear walk: each line fully used
    return sum;
}
```

## See Also

- [cpp-perf-reserve-capacity](perf-reserve-capacity.md) - keeping vectors contiguous and preallocated
- [cpp-perf-compact-hot-data](perf-compact-hot-data.md) - keeping hot elements small and dense
