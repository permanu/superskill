---
id: cpp-async-return-via-future
lang: cpp
prefix: async
title: Return results through the future
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [async, future, results, shared-state]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [async]
related: [cpp-async-launch-policy, cpp-conc-pass-by-value]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::async
    url: https://en.cppreference.com/w/cpp/thread/async
---
> The future's shared state is the synchronized path for value and exception.

## Why

CP.60 asks to use a future to return a value from a concurrent task. The std::async reference describes the mechanism: the call returns a future that will hold the result of the function call, the call to async synchronizes with the call to f, and the completion of f is sequenced before making the shared state ready. A side channel — a global the task writes and the caller reads — has none of that: the reader must add its own synchronization, and missing one line turns the access into a data race.

## Bad

```cpp
#include <future>

int shared_result = 0; // written by the task, read by main

int main() {
    auto result = std::async(std::launch::async, [] { shared_result = 42; });
    return shared_result == 42 ? 0 : 1; // reads before the task finished: data race
}
```

## Good

```cpp
#include <future>

int main() {
    auto result = std::async(std::launch::async, [] { return 42; });
    return result.get() == 42 ? 0 : 1; // the value travels through the future
}
```

## See Also

- [cpp-async-launch-policy](async-launch-policy.md) - making the task actually concurrent
- [cpp-conc-pass-by-value](conc-pass-by-value.md) - data handed to the task up front
