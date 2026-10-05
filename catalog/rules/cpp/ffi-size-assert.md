---
id: cpp-ffi-size-assert
lang: cpp
prefix: ffi
title: Pin shared struct layouts with static_assert
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static-assert, sizeof, layout, c-mirror]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: [static_assert]
related: [cpp-ffi-standard-layout, cpp-ffi-trivial-copyable]
sources:
  - title: cppreference - static_assert declaration
    url: https://en.cppreference.com/w/cpp/language/static_assert
  - title: cppreference - StandardLayoutType
    url: https://en.cppreference.com/w/cpp/named_req/StandardLayoutType
---
> The C mirror cannot include the C++ header; the assertion is the contract.

## Why

A struct shared with another language is declared twice: once in C++ and once in the foreign code, and the two declarations must agree on every offset and size. The static_assert declaration makes the C++ side check its half at compile time, so a field addition, a type widening, or a compiler layout change fails the build instead of corrupting data at run time. It is the mechanical guard for the layout that StandardLayoutType describes, and it costs nothing in the binary.

## Bad

```cpp
struct Packet {
    int length;
    int sequence;
}; // layout assumed by the other side but never checked

int main() {
    return 0;
}
```

## Good

```cpp
#include <cstdint>

struct Packet {
    std::int32_t length;
    std::uint16_t sequence;
};

static_assert(sizeof(Packet) == 8, "Packet layout changed: update the C mirror");

int main() {
    return 0;
}
```

## See Also

- [cpp-ffi-standard-layout](ffi-standard-layout.md) - the category the layout relies on
- [cpp-ffi-trivial-copyable](ffi-trivial-copyable.md) - the transport the bytes need
