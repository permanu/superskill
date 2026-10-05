---
id: cpp-test-static-assert
lang: cpp
prefix: test
title: Encode invariants that must hold at compile time as static_assert
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static_assert, compile-time, invariant, test]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [static_assert]
related: [cpp-perf-constexpr, cpp-test-sanitizers]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - static_assert declaration
    url: https://en.cppreference.com/w/cpp/language/static_assert
---
> Assert properties the compiler can check with static_assert instead of a run-time test.

## Why

Some invariants, such as the size of a type or a trait of a template parameter, are fully determined at compile time. Checking them at run time costs a branch and can only fail on the machine that runs it, while `static_assert` makes a violated invariant a build error on every platform, with the message at the point of the mistake. Compile-time checking is preferable wherever it is possible.

## Bad

```cpp
#include <cstdlib>

int buffer[4];

void test_buffer_size() {
    if (sizeof(int) < 4)
        std::abort(); // known at compile time, checked at run time
}
```

## Good

```cpp
static_assert(sizeof(int) >= 4, "int must be at least 32 bits");

int main() {
    return 0;
}
```

## See Also

- [cpp-perf-constexpr](perf-constexpr.md) - computing values at compile time
- [cpp-test-sanitizers](test-sanitizers.md) - the run-time counterpart for what the compiler cannot see
