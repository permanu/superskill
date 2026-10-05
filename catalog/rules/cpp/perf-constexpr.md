---
id: cpp-perf-constexpr
lang: cpp
prefix: perf
title: Move constant computation from run time to compile time with constexpr
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constexpr, compile-time, constant, static_assert]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [constexpr, static_assert]
related: [cpp-perf-measure-first, cpp-test-static-assert]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - constexpr specifier
    url: https://en.cppreference.com/w/cpp/language/constexpr
---
> Mark computations that are constant expressions constexpr so they run at compile time.

## Why

A value computed at run time costs work on every call and can fail there, while the same computation marked `constexpr` is evaluated once by the compiler, shrinks the binary, and can be checked with `static_assert`. Constant results also remove data races on shared values because there is no mutable state to race on. The computation stays usable at run time when arguments are not constant.

## Bad

```cpp
int factorial(int n) {
    int result = 1;
    while (n > 1)
        result *= n--;
    return result;
}

int main() {
    return factorial(5); // recomputed at run time on every call
}
```

## Good

```cpp
constexpr int factorial(int n) {
    int result = 1;
    while (n > 1)
        result *= n--;
    return result;
}

int main() {
    static_assert(factorial(5) == 120); // evaluated at compile time
    return factorial(5);
}
```

## See Also

- [cpp-perf-measure-first](perf-measure-first.md) - measuring what remains at run time
- [cpp-test-static-assert](test-static-assert.md) - compile-time checks as a test strategy
