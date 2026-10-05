---
id: cpp-conc-jthread-over-thread
lang: cpp
prefix: conc
title: Prefer std::jthread over std::thread so joining is automatic
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [jthread, thread, join, raii]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::jthread, std::thread]
related: [cpp-conc-no-detach, cpp-conc-stop-token, cpp-raii-wrap-resources]
sources:
  - title: cppreference - std::jthread
    url: https://en.cppreference.com/w/cpp/thread/jthread
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Create worker threads as std::jthread; destruction joins instead of terminating.

## Why

A joinable `std::thread` that is destroyed without `join()` calls `std::terminate`, so every exit path must remember to join, including exception paths. `std::jthread` requests stop and joins in its destructor, which makes the thread an ordinary RAII resource. It also carries a stop token, giving the worker a standard cooperative cancellation channel.

## Bad

```cpp
#include <thread>

void work();

int main() {
    std::thread worker(work);
    // an exception thrown here calls std::terminate: worker is joinable
    worker.join();
}
```

## Good

```cpp
#include <thread>

void work();

int main() {
    std::jthread worker(work); // joins on scope exit, on every path
}
```

## See Also

- [cpp-conc-no-detach](conc-no-detach.md) - never abandon a thread either
- [cpp-conc-stop-token](conc-stop-token.md) - cancelling the worker cooperatively
- [cpp-raii-wrap-resources](raii-wrap-resources.md) - threads are resources like any other
