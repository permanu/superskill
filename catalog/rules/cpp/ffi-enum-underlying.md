---
id: cpp-ffi-enum-underlying
lang: cpp
prefix: ffi
title: Give exported enums a fixed underlying type
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enum, underlying-type, abi, c-mirror]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: []
related: [cpp-ffi-size-assert, cpp-type-enum-class]
sources:
  - title: cppreference - Enumeration declaration
    url: https://en.cppreference.com/w/cpp/language/enum
  - title: cppreference - StandardLayoutType
    url: https://en.cppreference.com/w/cpp/named_req/StandardLayoutType
---
> An enum's size is its underlying type's size; without a base, that type is a guess.

## Why

The enum reference states that an enumeration has the same size, value representation, and alignment requirements as its underlying type. For an unscoped enum with no fixed base, the underlying type is implementation-defined — an integral type that can represent the values, no larger than `int` unless a value requires it. The C mirror in the other language assumes some width; pinning the base with `: std::uint8_t` makes the assumption true by construction and keeps the values in the range the C side expects.

## Bad

```cpp
enum WidgetState { widget_idle, widget_busy }; // underlying type is implementation-defined

int main() {
    return widget_idle == 0 ? 0 : 1;
}
```

## Good

```cpp
#include <cstdint>

enum WidgetState : std::uint8_t { widget_idle = 0, widget_busy = 1 }; // fixed width

int main() {
    return widget_idle == 0 ? 0 : 1;
}
```

## See Also

- [cpp-ffi-size-assert](ffi-size-assert.md) - pinning the struct layouts that hold it
- [cpp-type-enum-class](type-enum-class.md) - the scoped-enum discipline inside C++
