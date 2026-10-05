---
id: cpp-num-fixed-width
lang: cpp
prefix: num
title: Use fixed-width integer types for stored and transmitted values
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [int32_t, width, serialization, wire-format]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::int32_t, std::uint16_t]
related: [cpp-num-unsigned-bitops, cpp-sec-no-type-punning]
sources:
  - title: cppreference - Fixed width integer types
    url: https://en.cppreference.com/w/cpp/types/integer
  - title: cppreference - Fundamental types
    url: https://en.cppreference.com/w/cpp/language/types
---
> int and long are minimum widths; int32_t is exactly 32 bits with no padding.

## Why

The fixed-width names in `<cstdint>` are defined as an integer type of exactly N bits with no padding bits, while the fundamental types guarantee only minimum widths: an `int` is at least 16 bits and a `long` at least 32, so the same struct written with them has different layouts on different platforms. Any value that crosses a process, a file, or a network must have one agreed width; the exact-width types state it in the declaration, and the format macros in `<cinttypes>` exist for printing them.

## Bad

```cpp
struct Packet {
    long length;  // width varies by platform
    int sequence; // width varies by platform
};

int main() {
    return sizeof(Packet) > 0 ? 0 : 1;
}
```

## Good

```cpp
#include <cstdint>

struct Packet {
    std::int32_t length;    // exactly 32 bits
    std::uint16_t sequence; // exactly 16 bits
};

int main() {
    return sizeof(Packet) > 0 ? 0 : 1;
}
```

## See Also

- [cpp-num-unsigned-bitops](num-unsigned-bitops.md) - the same bit-pattern reasoning
- [cpp-sec-no-type-punning](sec-no-type-punning.md) - decoding the wire bytes safely
