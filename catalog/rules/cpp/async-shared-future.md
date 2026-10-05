---
id: cpp-async-shared-future
lang: cpp
prefix: async
title: Share a result with shared_future
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [shared-future, future, multiple-readers]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [shared_future]
related: [cpp-async-promise-broken, cpp-async-return-via-future]
sources:
  - title: cppreference - std::future
    url: https://en.cppreference.com/w/cpp/thread/future
  - title: cppreference - std::promise
    url: https://en.cppreference.com/w/cpp/thread/promise
---
> A future is a unique reference; share() hands the result to many readers.

## Why

The future reference states the property: a std::future is a unique reference to the result in a shared state — the result is not shared with any other asynchronous return objects — and points to std::shared_future for non-unique access. get() on a future consumes it, so a second reader of the same future object fails; share() converts the single reference into a shared one that any number of readers can get from, each receiving the same value.

## Bad

```cpp
#include <future>

int use(std::future<int>& result) { return result.get(); } // consumes it

int main() {
    auto result = std::async(std::launch::async, [] { return 42; });
    const int first = use(result);
    const int second = use(result); // throws: the future has no state
    return first + second == 84 ? 0 : 1;
}
```

## Good

```cpp
#include <future>

int use(const std::shared_future<int>& result) { return result.get(); } // many readers

int main() {
    std::shared_future<int> result =
        std::async(std::launch::async, [] { return 42; }).share();
    return use(result) + use(result) == 84 ? 0 : 1;
}
```

## See Also

- [cpp-async-promise-broken](async-promise-broken.md) - the state every reader waits on
- [cpp-async-return-via-future](async-return-via-future.md) - producing the value in the first place
