---
id: cpp-perf-measure-first
lang: cpp
prefix: perf
title: Change performance-critical code only after measuring it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [benchmark, measurement, optimization, chrono]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::chrono::steady_clock]
related: [cpp-perf-constexpr, cpp-perf-compact-hot-data]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Measure before optimizing; keep the clear version until data shows it is the bottleneck.

## Why

Performance folklore produces larger, harder-to-change code whose benefit is unverified; modern hardware and optimizers defeat naive assumptions, and even experts are regularly surprised. A simple microbenchmark with `<chrono>` can dispel the most obvious myths, and a profiler shows which parts are critical. Until a measurement identifies a bottleneck, the only guaranteed result of hand optimization is maintenance cost.

## Bad

```cpp
// Bad: pointer arithmetic "because it is faster", justified by intuition only.
int sum(const int* data, int size) {
    int total = 0;
    while (size--)
        total += *data++;
    return total;
}
```

## Good

```cpp
#include <chrono>
#include <cstddef>

int sum(const int* data, std::size_t size) {
    int total = 0;
    for (std::size_t i = 0; i < size; ++i)
        total += data[i];
    return total;
}

int main() {
    int data[1000]{};
    const auto start = std::chrono::steady_clock::now();
    const int total = sum(data, 1000);
    const auto elapsed = std::chrono::steady_clock::now() - start;
    return total + static_cast<int>(elapsed.count() >= 0); // measured, then decided
}
```

## See Also

- [cpp-perf-constexpr](perf-constexpr.md) - a change that is worth making without measurement
- [cpp-perf-compact-hot-data](perf-compact-hot-data.md) - memory layout decisions that need evidence
