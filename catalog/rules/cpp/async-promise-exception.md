---
id: cpp-async-promise-exception
lang: cpp
prefix: async
title: Let exceptions travel through the future
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [future, exception, shared-state, get]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [future]
related: [cpp-async-promise-broken, cpp-err-expected-for-recoverable]
sources:
  - title: cppreference - std::future
    url: https://en.cppreference.com/w/cpp/thread/future
  - title: cppreference - std::promise
    url: https://en.cppreference.com/w/cpp/thread/promise
---
> get() rethrows the exception stored in the shared state.

## Why

The future reference shows the mechanism in its exception example: the task stores what it caught with set_exception(std::current_exception()), and the waiting side's get() rethrows it — the example prints the exception from the thread. The promise reference names the operation: make ready stores the result or the exception in the shared state. Catching inside the task and returning a sentinel discards the type and the message; letting the exception reach the shared state keeps the failure intact for the caller.

## Bad

```cpp
#include <future>
#include <stdexcept>

int work() {
    try {
        throw std::runtime_error("failed");
    } catch (...) {
        return -1; // the exception stops here
    }
}

int main() {
    auto result = std::async(std::launch::async, work);
    return result.get() == -1 ? 1 : 0;
}
```

## Good

```cpp
#include <future>
#include <stdexcept>

int work() {
    throw std::runtime_error("failed"); // stored in the shared state
}

int main() {
    auto result = std::async(std::launch::async, work);
    try {
        (void)result.get(); // rethrows the stored exception
        return 1;
    } catch (const std::runtime_error&) {
        return 0;
    }
}
```

## See Also

- [cpp-async-promise-broken](async-promise-broken.md) - the other failure the shared state reports
- [cpp-err-expected-for-recoverable](err-expected-for-recoverable.md) - failures as values instead
