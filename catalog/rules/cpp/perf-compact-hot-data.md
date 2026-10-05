---
id: cpp-perf-compact-hot-data
lang: cpp
prefix: perf
title: Keep hot data compact and move rarely used fields out of the hot structure
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [layout, cache, struct, hot-cold]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::string, std::vector]
related: [cpp-perf-contiguous-access, cpp-perf-measure-first]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Split cold fields out of hot structs so hot arrays stay small and cache-friendly.

## Why

Performance is typically dominated by memory access times, so a struct that carries a rarely used string or debug field inflates every element of the array and wastes cache lines on data the hot loop never reads. Moving cold fields to a side structure keeps the hot representation dense: more elements fit per cache line and a linear scan touches less memory. The split also makes the hot loop's data dependencies obvious.

## Bad

```cpp
#include <string>
#include <vector>

struct Particle {
    double x;
    double y;
    double z;
    std::string debug_name; // cold field bloats every element
};

double total_x(const std::vector<Particle>& particles) {
    double sum = 0;
    for (const Particle& p : particles)
        sum += p.x;
    return sum;
}
```

## Good

```cpp
#include <string>
#include <vector>

struct Particle {
    double x;
    double y;
    double z; // hot data only
};

struct NamedParticle {
    Particle particle; // hot array stays compact
    std::string debug_name;
};

double total_x(const std::vector<Particle>& particles) {
    double sum = 0;
    for (const Particle& p : particles)
        sum += p.x;
    return sum;
}
```

## See Also

- [cpp-perf-contiguous-access](perf-contiguous-access.md) - how layout interacts with traversal
- [cpp-perf-measure-first](perf-measure-first.md) - proving the layout matters before splitting
