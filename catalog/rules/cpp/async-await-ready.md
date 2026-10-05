---
id: cpp-async-await-ready
lang: cpp
prefix: async
title: Answer await_ready when the result is already there
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [coroutines, await-ready, suspension]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [await_ready]
related: [cpp-async-coroutine-own, cpp-async-coroutine-lifetime]
sources:
  - title: cppreference - Coroutines
    url: https://en.cppreference.com/w/cpp/language/coroutines
---
> await_ready is the short-cut that skips suspension for completed work.

## Why

The coroutines reference describes the awaiter protocol: after the awaiter object is obtained, await_ready() is called as a short-cut to avoid the cost of suspension if it is known that the result is ready or can be completed synchronously; only when it is false is the coroutine suspended and await_suspend called. An awaiter that always suspends pays the full bookkeeping — saving the frame, scheduling a resume — for operations that had already finished.

## Bad

```cpp
#include <coroutine>

struct immediate {
    bool await_ready() const { return false; } // suspends although nothing is pending
    void await_suspend(std::coroutine_handle<>) const {}
    void await_resume() const {}
};

struct task {
    struct promise_type {
        task get_return_object() { return {}; }
        std::suspend_never initial_suspend() noexcept { return {}; }
        std::suspend_never final_suspend() noexcept { return {}; }
        void return_void() {}
        void unhandled_exception() {}
    };
};

task work() { co_await immediate{}; } // full suspension for an already-ready result

int main() {
    work();
    return 0;
}
```

## Good

```cpp
#include <coroutine>

struct immediate {
    bool await_ready() const { return true; } // ready: no suspension
    void await_suspend(std::coroutine_handle<>) const {}
    void await_resume() const {}
};

struct task {
    struct promise_type {
        task get_return_object() { return {}; }
        std::suspend_never initial_suspend() noexcept { return {}; }
        std::suspend_never final_suspend() noexcept { return {}; }
        void return_void() {}
        void unhandled_exception() {}
    };
};

task work() { co_await immediate{}; } // runs through without suspending

int main() {
    work();
    return 0;
}
```

## See Also

- [cpp-async-coroutine-own](async-coroutine-own.md) - who destroys the frame after suspension
- [cpp-async-coroutine-lifetime](async-coroutine-lifetime.md) - what lives in the frame across suspensions
