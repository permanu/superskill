---
id: cpp-conc-scoped-lock-multiple
lang: cpp
prefix: conc
title: Acquire multiple mutexes with scoped_lock, never as nested lock_guards
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deadlock, mutex, scoped_lock, lock-ordering]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::scoped_lock, std::lock_guard]
related: [cpp-raii-lock-guard, cpp-conc-mutex-with-data]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::lock_guard
    url: https://en.cppreference.com/w/cpp/thread/lock_guard
---
> Lock several mutexes in one scoped_lock so the deadlock-avoidance algorithm orders them.

## Why

Two code paths that acquire the same pair of mutexes in opposite orders can deadlock: each holds one lock and waits for the other. Nested `lock_guard`s fix the order by construction, so any future path with the reverse order creates the bug. `std::scoped_lock` with several mutexes uses a deadlock-avoidance algorithm that acquires them safely regardless of argument order.

## Bad

```cpp
#include <mutex>

std::mutex first;
std::mutex second;

void transfer() {
    std::lock_guard<std::mutex> lock_first(first);
    std::lock_guard<std::mutex> lock_second(second); // deadlocks against reverse order
}
```

## Good

```cpp
#include <mutex>

std::mutex first;
std::mutex second;

void transfer() {
    const std::scoped_lock lock(first, second); // deadlock-avoiding
}
```

## See Also

- [cpp-raii-lock-guard](raii-lock-guard.md) - scoped ownership for a single mutex
- [cpp-conc-mutex-with-data](conc-mutex-with-data.md) - keeping each mutex tied to its data
