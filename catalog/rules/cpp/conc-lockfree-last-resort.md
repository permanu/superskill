---
id: cpp-conc-lockfree-last-resort
lang: cpp
prefix: conc
title: Do not write lock-free code by hand unless measurement proves it is required
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [lock-free, compare_exchange, atomic, contention]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [compare_exchange_weak, fetch_add]
related: [cpp-conc-default-memory-order, cpp-conc-atomic-not-volatile]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::atomic
    url: https://en.cppreference.com/w/cpp/atomic/atomic
---
> Use the standard atomic operations; a hand-rolled compare-exchange loop needs benchmarks and formal reasoning.

## Why

A compare-exchange retry loop looks simple but must handle the ABA problem, memory reclamation, and the right memory order at every operation; mistakes produce corruption that only appears under contention and on some architectures. The standard library's read-modify-write operations are already correct and compile to a single instruction on common targets. Lock-free design is justified by measured contention in a hot path, not by the assumption that locks are slow.

## Bad

```cpp
#include <atomic>

std::atomic<int> counter{0};

void increment() {
    int expected = counter.load();
    while (!counter.compare_exchange_weak(expected, expected + 1)) {
        // retry loop: memory order and progress guarantees left implicit
    }
}
```

## Good

```cpp
#include <atomic>

std::atomic<int> counter{0};

void increment() {
    counter.fetch_add(1); // single atomic read-modify-write
}
```

## See Also

- [cpp-conc-default-memory-order](conc-default-memory-order.md) - ordering when weaker modes are chosen deliberately
- [cpp-conc-atomic-not-volatile](conc-atomic-not-volatile.md) - the standard primitives that replace folklore
