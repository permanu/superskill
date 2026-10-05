---
id: cpp-conc-tasks-not-threads
lang: cpp
prefix: conc
title: Express concurrent work as tasks with async and futures, not raw thread bookkeeping
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [async, future, task, thread, promise]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::async, std::future]
related: [cpp-conc-jthread-over-thread, cpp-conc-pass-by-value]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::async
    url: https://en.cppreference.com/w/cpp/thread/async
---
> Spawn work with std::async and receive its result through a future, not a hand-wired thread and promise.

## Why

A thread plus promise/future wired by hand repeats the same bookkeeping at every call site: capture, set_value, join, and exception transport, each of which can be forgotten. `std::async` starts the task and returns a future that carries both the return value and any exception, so the caller writes the request and then `get()`. The task abstraction also lets the implementation choose a thread or a pool without changing callers.

## Bad

```cpp
#include <future>
#include <thread>

int compute(int input);

int main() {
    std::promise<int> promise;
    std::thread worker([&promise] { promise.set_value(compute(21)); });
    const int result = promise.get_future().get();
    worker.join();
    return result;
}
```

## Good

```cpp
#include <future>

int compute(int input);

int main() {
    std::future<int> result = std::async(std::launch::async, compute, 21);
    return result.get(); // carries the value or rethrows the exception
}
```

## See Also

- [cpp-conc-jthread-over-thread](conc-jthread-over-thread.md) - when a long-lived owned thread is the right model
- [cpp-conc-pass-by-value](conc-pass-by-value.md) - how arguments reach the task
