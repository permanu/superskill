---
id: cpp-conc-no-callback-under-lock
lang: cpp
prefix: conc
title: Never call unknown code while holding a lock
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [callback, lock, deadlock, reentrancy]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::function]
related: [cpp-conc-mutex-with-data, cpp-raii-lock-guard]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Copy what the callback needs under the lock, release it, then invoke the callback.

## Why

A callback is code you do not control: it may take another lock, call back into the same object, or block for a long time. Calling it while the lock is held makes deadlock possible through lock-order inversion or reentrancy and extends the critical section by an unbounded amount. Taking a snapshot under the lock and invoking outside keeps the lock held only for the data access.

## Bad

```cpp
#include <functional>
#include <mutex>

std::mutex m;
std::function<void()> callback;

void run_callback() {
    std::lock_guard<std::mutex> lock(m);
    callback(); // unknown code executes while the lock is held
}
```

## Good

```cpp
#include <functional>
#include <mutex>

std::mutex m;
std::function<void()> callback;

void run_callback() {
    std::function<void()> local;
    {
        std::lock_guard<std::mutex> lock(m);
        local = callback; // snapshot under the lock
    }
    local(); // call outside: no lock held
}
```

## See Also

- [cpp-conc-mutex-with-data](conc-mutex-with-data.md) - the lock exists only for the data
- [cpp-raii-lock-guard](raii-lock-guard.md) - scope the lock to the data access
