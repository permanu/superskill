---
id: cpp-async-future-dtor
lang: cpp
prefix: async
title: Keep the future returned by std::async
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [async, future, destructor, blocking]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [async]
related: [cpp-async-launch-policy, cpp-conc-tasks-not-threads]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::async
    url: https://en.cppreference.com/w/cpp/thread/async
---
> A discarded async future blocks at the end of the expression.

## Why

CP.61 asks to use async() to spawn concurrent tasks. The std::async reference's Notes give the trap: if the future obtained from std::async is not moved from or bound to a reference, the destructor of the future blocks at the end of the full expression until the asynchronous operation completes, essentially making the call synchronous — its example shows the second call not starting until the first has finished. Futures obtained by other means never block in their destructors. Bind the future to a name and get the result.

## Bad

```cpp
#include <future>

int work() { return 42; }

int main() {
    std::async(std::launch::async, work); // the temporary future blocks here
    return 0;
}
```

## Good

```cpp
#include <future>

int work() { return 42; }

int main() {
    auto result = std::async(std::launch::async, work); // kept alive
    return result.get() == 42 ? 0 : 1;
}
```

## See Also

- [cpp-async-launch-policy](async-launch-policy.md) - the policy that decides if it runs at all
- [cpp-conc-tasks-not-threads](conc-tasks-not-threads.md) - tasks through async and futures
