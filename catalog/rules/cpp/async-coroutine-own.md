---
id: cpp-async-coroutine-own
lang: cpp
prefix: async
title: Give every suspended coroutine an owner
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [coroutines, handle, ownership, destroy]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [coroutine_handle]
related: [cpp-async-await-ready, cpp-async-coroutine-lifetime]
sources:
  - title: cppreference - Coroutines
    url: https://en.cppreference.com/w/cpp/language/coroutines
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> A coroutine_handle is non-owning; a frame that suspends needs someone to resume or destroy it.

## Why

The coroutines reference describes the handle as non-owning: it is used from outside the coroutine to resume execution or to destroy the coroutine state, and the state is freed only when the coroutine terminates or its handle destroys it. R.1 asks to manage resources automatically using resource handles and RAII. A coroutine that suspends and whose handle is dropped leaks the frame and never runs again; a task type whose destructor calls destroy — or a coroutine configured with suspend_never so it runs to completion — is what supplies the missing owner.

## Bad

```cpp
#include <coroutine>

struct task {
    struct promise_type {
        task get_return_object() { return {}; }
        std::suspend_always initial_suspend() noexcept { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        void return_void() {}
        void unhandled_exception() {}
    };
};

task work() {
    co_await std::suspend_always{}; // suspends and stays suspended
}

int main() {
    work(); // no handle kept: the frame is never resumed or destroyed
    return 0;
}
```

## Good

```cpp
#include <coroutine>

struct task {
    struct promise_type {
        task get_return_object() { return {}; }
        std::suspend_never initial_suspend() noexcept { return {}; }
        std::suspend_never final_suspend() noexcept { return {}; }
        void return_void() {}
        void unhandled_exception() {}
    };
};

task work() {
    co_return; // runs to completion; the frame is released
}

int main() {
    work();
    return 0;
}
```

## See Also

- [cpp-async-await-ready](async-await-ready.md) - not suspending when there is nothing to wait for
- [cpp-async-coroutine-lifetime](async-coroutine-lifetime.md) - what the frame must keep alive
