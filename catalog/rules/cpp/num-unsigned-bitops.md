---
id: cpp-num-unsigned-bitops
lang: cpp
prefix: num
title: Use unsigned types for bit manipulation
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bits, shifts, masks, unsigned]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-num-signed-arithmetic, cpp-num-fixed-width]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Shifts and masks on signed types run into implementation-defined behavior at the sign bit.

## Why

ES.101 says to use unsigned types for bit manipulation because signed types are subject to various forms of implementation-defined behavior when used that way: shifting a one into the sign position, the representation of negative values, and the value of the sign bit itself are not fully portable. Masks and shifts are operations on bit patterns, so the unsigned types, which have no sign bit with special meaning, express them exactly.

## Bad

```cpp
int main() {
    const int flags = 0b0101;
    const int mask = 1 << 3;
    const int combined = flags | mask; // signed bit manipulation
    return combined == 0b1101 ? 0 : 1;
}
```

## Good

```cpp
int main() {
    const unsigned int flags = 0b0101u;
    const unsigned int mask = 1u << 3;
    const unsigned int combined = flags | mask; // unsigned bit manipulation
    return combined == 0b1101u ? 0 : 1;
}
```

## See Also

- [cpp-num-signed-arithmetic](num-signed-arithmetic.md) - signedness chosen by the operation
- [cpp-num-fixed-width](num-fixed-width.md) - choosing the exact width of the bit pattern
