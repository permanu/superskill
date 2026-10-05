---
id: cpp-const-constinit
lang: cpp
prefix: const
title: Use constinit for globals that must be initialized before dynamic initialization
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constinit, static-init, initialization-order, globals]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [constinit]
related: [cpp-const-consteval, cpp-const-immutable-by-default]
sources:
  - title: cppreference - constinit specifier
    url: https://en.cppreference.com/w/cpp/language/constinit
  - title: cppreference - constexpr specifier
    url: https://en.cppreference.com/w/cpp/language/constexpr
---
> constinit rejects dynamic initialization without making the value const.

## Why

The constinit reference says the specifier asserts that a variable has static initialization — zero initialization and constant initialization — and that a constinit variable with dynamic initialization makes the program ill-formed. Unlike `constexpr`, it neither makes the object const nor requires constant destruction, so a mutable global (the reference's example changes the value at run time) can use it. That is what makes it the tool for the static initialization order problem: a global initialized by a function call has an order-dependent value; `constinit` refuses to compile it.

## Bad

```cpp
#include <cstdint>

std::uint32_t base() { return 7; }

std::uint32_t counter = base(); // dynamic initialization at static-init time

int main() {
    return counter == 7 ? 0 : 1;
}
```

## Good

```cpp
#include <cstdint>

constexpr std::uint32_t base() { return 7; }

constinit std::uint32_t counter = base(); // static initialization asserted

int main() {
    return counter == 7 ? 0 : 1;
}
```

## See Also

- [cpp-const-consteval](const-consteval.md) - the compile-time-call counterpart
- [cpp-const-immutable-by-default](const-immutable-by-default.md) - when the value should not change at all
