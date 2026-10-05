---
id: cpp-async-launch-policy
lang: cpp
prefix: async
title: State the launch policy explicitly
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [async, launch-policy, deferred]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [async]
related: [cpp-async-future-dtor, cpp-async-return-via-future]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::async
    url: https://en.cppreference.com/w/cpp/thread/async
---
> The default policy may run the task deferred, on the first wait.

## Why

CP.61 asks to use async() to spawn concurrent tasks. The std::async reference states that the one-argument overload behaves as if called with the async and deferred flags together, and that when more than one flag is set it is implementation-defined which policy is selected. With the deferred policy the call is stored and evaluated lazily on the first wait, in the waiting thread; only the explicit async flag guarantees a new thread of execution. Say which behavior the call needs.

## Bad

```cpp
#include <future>

int work() { return 42; }

int main() {
    auto result = std::async(work); // the implementation chooses the policy
    return result.get() == 42 ? 0 : 1;
}
```

## Good

```cpp
#include <future>

int work() { return 42; }

int main() {
    auto result = std::async(std::launch::async, work); // explicitly asynchronous
    return result.get() == 42 ? 0 : 1;
}
```

## See Also

- [cpp-async-future-dtor](async-future-dtor.md) - the lifetime that follows the policy
- [cpp-async-return-via-future](async-return-via-future.md) - getting the value back
