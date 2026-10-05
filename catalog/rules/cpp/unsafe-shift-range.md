---
id: cpp-unsafe-shift-range
lang: cpp
prefix: unsafe
title: Check shift counts before shifting
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [shift, count, width, undefined-behavior]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-num-unsigned-bitops, cpp-num-avoid-overflow]
sources:
  - title: cppreference - Arithmetic operators
    url: https://en.cppreference.com/w/cpp/language/operator_arithmetic
  - title: cppreference - Undefined behavior
    url: https://en.cppreference.com/w/cpp/language/ub
---
> A shift count at or beyond the operand's width is undefined behavior.

## Why

The arithmetic reference states the bound: if the value of the right operand is negative or is not less than the number of bits in the left operand, the behavior is undefined. The UB reference counts such misuse among the classes of behavior that make a program meaningless. The check belongs at the point of use — a static_assert when the count is a constant, a comparison when it is not.

## Bad

```cpp
int main() {
    const int value = 1;
    return value << 32; // count is not less than the width of int
}
```

## Good

```cpp
#include <limits>

int main() {
    constexpr unsigned value = 1U;
    constexpr unsigned count = 4U;
    static_assert(count < std::numeric_limits<unsigned>::digits, "count must be in range");
    return static_cast<int>(value << count);
}
```

## See Also

- [cpp-num-unsigned-bitops](num-unsigned-bitops.md) - the type discipline for bit manipulation
- [cpp-num-avoid-overflow](num-avoid-overflow.md) - guarding the arithmetic around it
