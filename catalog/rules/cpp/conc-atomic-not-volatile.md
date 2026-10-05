---
id: cpp-conc-atomic-not-volatile
lang: cpp
prefix: conc
title: Synchronize shared data with atomics or mutexes, never with volatile
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [volatile, atomic, data-race, synchronization]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::atomic, volatile]
related: [cpp-conc-mutex-with-data, cpp-conc-default-memory-order]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::atomic
    url: https://en.cppreference.com/w/cpp/atomic/atomic
---
> Use std::atomic or a mutex for cross-thread state; volatile only for memory-mapped I/O.

## Why

`volatile` suppresses compiler optimizations around a variable but establishes no inter-thread synchronization: accesses are not atomic, can be reordered by hardware, and a concurrent read and write is still a data race. `std::atomic` defines both atomicity and ordering, so the value seen by another thread is well-defined. Volatile remains correct only for memory that changes outside the program, such as hardware registers or signal handlers.

## Bad

```cpp
volatile int counter = 0;

void increment() {
    counter = counter + 1; // read-modify-write is not atomic: lost updates
}
```

## Good

```cpp
#include <atomic>

std::atomic<int> counter = 0;

void increment() {
    ++counter; // atomic read-modify-write
}
```

## See Also

- [cpp-conc-mutex-with-data](conc-mutex-with-data.md) - guarding compound state that atomics cannot cover
- [cpp-conc-default-memory-order](conc-default-memory-order.md) - choosing the ordering once the operation is atomic
