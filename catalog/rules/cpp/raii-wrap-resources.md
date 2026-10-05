---
id: cpp-raii-wrap-resources
lang: cpp
prefix: raii
title: Wrap every acquired resource in an RAII handle owned by a local object
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [raii, resource, lock, handle, cleanup]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::lock_guard, std::unique_ptr]
related: [cpp-raii-raw-non-owning, cpp-raii-lock-guard, cpp-err-raii-not-catch]
sources:
  - title: cppreference - RAII
    url: https://en.cppreference.com/w/cpp/language/raii
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Acquire resources in constructors and release them in destructors; callers never release manually.

## Why

Manual release must be repeated on every exit path, and the one path that forgets leaks the resource or deadlocks. Binding the resource's lifetime to an object makes release happen exactly once on normal exit, early return, and stack unwinding. The destructor is also where release order is encoded: members are destroyed in reverse order of construction.

## Bad

```cpp
#include <mutex>

std::mutex m;
int total = 0;

void update(int value) {
    m.lock();
    if (value < 0)
        return; // mutex never released
    total += value;
    m.unlock();
}
```

## Good

```cpp
#include <mutex>

std::mutex m;
int total = 0;

void update(int value) {
    const std::lock_guard<std::mutex> lock(m);
    if (value < 0)
        return; // released by the guard on every path
    total += value;
}
```

## See Also

- [cpp-raii-raw-non-owning](raii-raw-non-owning.md) - ownership belongs in types, not raw handles
- [cpp-raii-lock-guard](raii-lock-guard.md) - the standard RAII wrapper for mutexes
- [cpp-err-raii-not-catch](err-raii-not-catch.md) - cleanup belongs in destructors, not catch blocks
