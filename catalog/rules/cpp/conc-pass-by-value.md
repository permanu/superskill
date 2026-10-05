---
id: cpp-conc-pass-by-value
lang: cpp
prefix: conc
title: Pass small data between threads by value, not by reference into a possibly shorter lifetime
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [thread, capture, lifetime, reference]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::ref, std::jthread]
related: [cpp-conc-jthread-over-thread, cpp-raii-param-ownership]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Copy small values into the thread; a reference capture is a lifetime bet the compiler cannot check.

## Why

Passing a reference to a thread lets the thread read an object whose lifetime the caller controls, and the thread usually outlives the call that started it. The reference is invisible at the call site, so nothing warns when the local dies first and the thread reads freed memory. Copying small values removes the shared lifetime entirely; for large data, transfer ownership through a smart pointer or a container instead.

## Bad

```cpp
#include <functional>
#include <thread>

void process(int value);

std::jthread worker;

void start() {
    int value = 42;
    worker = std::jthread(process, std::ref(value)); // worker may outlive value
}
```

## Good

```cpp
#include <thread>

void process(int value);

std::jthread worker;

void start() {
    int value = 42;
    worker = std::jthread(process, value); // copied into the thread
}
```

## See Also

- [cpp-conc-jthread-over-thread](conc-jthread-over-thread.md) - owning the thread that receives the data
- [cpp-raii-param-ownership](raii-param-ownership.md) - expressing ownership in parameter types
