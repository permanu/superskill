---
id: cpp-const-consteval
lang: cpp
prefix: const
title: Use consteval when a call must be evaluated at compile time
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [consteval, immediate, compile-time, constant]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [consteval]
related: [cpp-const-constinit, cpp-perf-constexpr]
sources:
  - title: cppreference - consteval specifier
    url: https://en.cppreference.com/w/cpp/language/consteval
  - title: cppreference - constexpr specifier
    url: https://en.cppreference.com/w/cpp/language/constexpr
---
> constexpr permits compile-time evaluation; consteval requires it.

## Why

The consteval reference defines an immediate function as one whose every potentially-evaluated call must produce a compile-time constant, and notes that it implies `inline` like constexpr while forbidding the two specifiers together. A constexpr function, by contrast, may be evaluated at run time when its arguments are not constants. Where the value must be baked in — a generated table, a key, a configuration constant — `consteval` makes the guarantee the compiler enforces instead of a convention reviewers check.

## Bad

```cpp
#include <cstdint>

constexpr std::uint32_t mix(std::uint32_t seed) {
    return seed * 2654435761u; // intended as a compile-time constant
}

int main() {
    const std::uint32_t runtime_seed = 7;
    const std::uint32_t value = mix(runtime_seed); // allowed to run at run time
    return value != 0 ? 0 : 1;
}
```

## Good

```cpp
#include <cstdint>

consteval std::uint32_t mix(std::uint32_t seed) {
    return seed * 2654435761u; // every call must be a constant expression
}

int main() {
    constexpr std::uint32_t value = mix(7); // guaranteed compile time
    return value != 0 ? 0 : 1;
}
```

## See Also

- [cpp-const-constinit](const-constinit.md) - compile-time initialization for mutable globals
- [cpp-perf-constexpr](perf-constexpr.md) - the compile-time computation it builds on
