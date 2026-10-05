---
id: cpp-async-coroutine-lifetime
lang: cpp
prefix: async
title: Pass data to coroutines by value
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [coroutines, parameters, dangling, lifetime]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [co_await]
related: [cpp-async-coroutine-own, cpp-unsafe-return-local-address]
sources:
  - title: cppreference - Coroutines
    url: https://en.cppreference.com/w/cpp/language/coroutines
  - title: cppreference - Lifetime
    url: https://en.cppreference.com/w/cpp/language/lifetime
---
> By-reference parameters stay references; the referred object may die before resume.

## Why

The coroutines reference states the copy rule: when a coroutine begins, all function parameters are copied into the coroutine state — by-value parameters are moved or copied, by-reference parameters remain references, and those may become dangling if the coroutine is resumed after the lifetime of the referred object ends. The page's examples show captures and temporary objects dying while the suspended frame still holds the reference. A by-value parameter moves the data into the frame, where it lives as long as the coroutine.

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

task work(const int& value) { // reference parameter: stays a reference
    co_await std::suspend_always{};
    (void)value; // dangling once the caller's object is gone
}

int main() {
    work(42); // the temporary bound to value dies when the call suspends
    return 0;
}
```

## Good

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

task work(int value) { // by value: copied into the coroutine state
    co_await std::suspend_always{};
    (void)value;
}

int main() {
    work(42);
    return 0;
}
```

## See Also

- [cpp-async-coroutine-own](async-coroutine-own.md) - keeping the frame alive while it is needed
- [cpp-unsafe-return-local-address](unsafe-return-local-address.md) - the same dangling pattern without coroutines
