---
id: cpp-conc-name-locks
lang: cpp
prefix: conc
title: Name every lock guard so it lives for the whole scope it protects
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [lock_guard, unnamed, temporary, critical-section]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::lock_guard, std::unique_lock]
related: [cpp-raii-lock-guard, cpp-conc-mutex-with-data]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::lock_guard
    url: https://en.cppreference.com/w/cpp/thread/lock_guard
---
> Give the guard a name; an unnamed temporary unlocks immediately and protects nothing.

## Why

`std::lock_guard<std::mutex>(m);` looks like a lock but is a declaration of a temporary that is destroyed at the end of the same statement, releasing the mutex before the next line. The critical section then runs unprotected while the code reads as if it were safe. Naming the guard makes its lifetime the enclosing scope, which is the intended protection window.

## Bad

```cpp
#include <mutex>
#include <vector>

std::mutex m;
std::vector<int> values;

void add(int value) {
    std::lock_guard<std::mutex>{m}; // temporary: locked and released immediately
    values.push_back(value);        // runs unprotected
}
```

## Good

```cpp
#include <mutex>
#include <vector>

std::mutex m;
std::vector<int> values;

void add(int value) {
    const std::lock_guard<std::mutex> lock(m); // held for the scope
    values.push_back(value);
}
```

## See Also

- [cpp-raii-lock-guard](raii-lock-guard.md) - why the guard is the locking mechanism
- [cpp-conc-mutex-with-data](conc-mutex-with-data.md) - what the guard protects
