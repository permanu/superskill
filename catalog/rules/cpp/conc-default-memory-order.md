---
id: cpp-conc-default-memory-order
lang: cpp
prefix: conc
title: Use the default sequential consistency unless a weaker memory order is proven safe
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [memory_order, relaxed, release, acquire, atomic]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::memory_order_seq_cst, memory_order_release]
related: [cpp-conc-atomic-not-volatile, cpp-conc-lockfree-last-resort]
sources:
  - title: cppreference - std::memory_order
    url: https://en.cppreference.com/w/cpp/atomic/memory_order
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Leave atomics at the default seq_cst order; weaken the order only with a proof of what it permits.

## Why

Atomic operations are sequentially consistent by default, which gives the strongest ordering and is the easiest to reason about. A relaxed store provides atomicity but no visibility guarantees: other non-atomic writes can be reordered around it, so a reader may see the flag without the payload. Weaker orders are a performance tool for measured hot paths, and each use requires knowing the exact happens-before relation it must establish.

## Bad

```cpp
#include <atomic>

std::atomic<bool> ready{false};
int payload = 0;

void publish() {
    payload = 42;
    ready.store(true, std::memory_order_relaxed); // payload may be invisible to readers
}
```

## Good

```cpp
#include <atomic>

std::atomic<bool> ready{false};
int payload = 0;

void publish() {
    payload = 42;
    ready.store(true, std::memory_order_release); // publishes payload to acquirers
}
```

## See Also

- [cpp-conc-atomic-not-volatile](conc-atomic-not-volatile.md) - atomicity first, ordering second
- [cpp-conc-lockfree-last-resort](conc-lockfree-last-resort.md) - the same discipline for lock-free algorithms
