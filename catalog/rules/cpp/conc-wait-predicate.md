---
id: cpp-conc-wait-predicate
lang: cpp
prefix: conc
title: Always wait on a condition variable with a predicate
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [condition_variable, wait, predicate, spurious-wakeup]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::condition_variable, wait]
related: [cpp-conc-mutex-with-data, cpp-raii-lock-guard]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::condition_variable
    url: https://en.cppreference.com/w/cpp/thread/condition_variable
---
> Wait with a predicate; a bare wait can return on a spurious wakeup with the condition still false.

## Why

`condition_variable::wait` may return without any notification, and notifications can be lost before the waiter blocks, so a bare `wait` can resume while the condition it depends on is false. The predicated overload loops internally: it checks the condition before waiting and after every wakeup, so the thread proceeds only when the condition actually holds. The predicate also documents what the wait is for.

## Bad

```cpp
#include <condition_variable>
#include <mutex>

std::mutex m;
std::condition_variable cv;
bool ready = false;

void wait_ready() {
    std::unique_lock<std::mutex> lock(m);
    cv.wait(lock); // may return while ready is still false
}
```

## Good

```cpp
#include <condition_variable>
#include <mutex>

std::mutex m;
std::condition_variable cv;
bool ready = false;

void wait_ready() {
    std::unique_lock<std::mutex> lock(m);
    cv.wait(lock, [] { return ready; }); // rechecks after every wakeup
}
```

## See Also

- [cpp-conc-mutex-with-data](conc-mutex-with-data.md) - the state the predicate reads
- [cpp-raii-lock-guard](raii-lock-guard.md) - lock ownership for the wait
