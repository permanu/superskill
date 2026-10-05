---
id: cpp-async-promise-broken
lang: cpp
prefix: async
title: Fulfill or fail every promise
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [promise, broken-promise, future]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [promise]
related: [cpp-async-promise-exception, cpp-async-shared-future]
sources:
  - title: cppreference - std::promise
    url: https://en.cppreference.com/w/cpp/thread/promise
  - title: cppreference - std::future
    url: https://en.cppreference.com/w/cpp/thread/future
---
> A promise destroyed without a value leaves broken_promise in its future.

## Why

The promise reference defines what happens when a promise goes away without storing anything: it abandons the shared state, storing a std::future_error with the error code broken_promise and making the state ready. The waiting side then gets an exception from get() instead of a value. Every promise path — success, failure, or early return — must make the state ready, or the caller must be prepared for the broken-promise exception.

## Bad

```cpp
#include <future>

int main() {
    std::promise<int> promise;
    std::future<int> result = promise.get_future();
    {
        std::promise<int> dropped = std::move(promise); // destroyed without a value
    }
    try {
        (void)result.get();
        return 1;
    } catch (const std::future_error&) {
        return 0; // broken promise
    }
}
```

## Good

```cpp
#include <future>

int main() {
    std::promise<int> promise;
    std::future<int> result = promise.get_future();
    promise.set_value(42); // the contract is fulfilled
    return result.get() == 42 ? 0 : 1;
}
```

## See Also

- [cpp-async-promise-exception](async-promise-exception.md) - the failure that is stored deliberately
- [cpp-async-shared-future](async-shared-future.md) - reading the same result from many places
