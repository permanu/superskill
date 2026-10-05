---
id: cpp-raii-lock-guard
lang: cpp
prefix: raii
title: Lock mutexes through lock_guard or scoped_lock wrappers, never plain lock and unlock
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mutex, lock, lock_guard, deadlock, raii]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::lock_guard, std::scoped_lock]
related: [cpp-raii-wrap-resources, cpp-raii-unique-default]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::lock_guard
    url: https://en.cppreference.com/w/cpp/thread/lock_guard
---
> Acquire mutexes with lock_guard or scoped_lock so release happens on every exit path.

## Why

A manually locked mutex is released only where `unlock()` is written, so an exception, early return, or forgotten branch leaves it locked and the next acquirer deadlocks. `lock_guard` releases in its destructor during normal exit and stack unwinding alike. For several mutexes at once, `scoped_lock` also runs a deadlock-avoidance algorithm that ad-hoc lock calls cannot reproduce.

## Bad

```cpp
#include <mutex>
#include <vector>

std::mutex m;
std::vector<int> values;

void add(int value) {
    m.lock();
    values.push_back(value); // if push_back throws, the mutex stays locked
    m.unlock();
}
```

## Good

```cpp
#include <mutex>
#include <vector>

std::mutex m;
std::vector<int> values;

void add(int value) {
    const std::lock_guard<std::mutex> lock(m);
    values.push_back(value); // released on exception too
}
```

## See Also

- [cpp-raii-wrap-resources](raii-wrap-resources.md) - mutexes are resources like any other
- [cpp-raii-unique-default](raii-unique-default.md) - ownership types for the objects being guarded
