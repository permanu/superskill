---
id: cpp-num-signed-arithmetic
lang: cpp
prefix: num
title: Use signed types for arithmetic; unsigned wraps instead of going negative
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [signed, unsigned, arithmetic, underflow]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::ptrdiff_t]
related: [cpp-num-no-mixed-sign, cpp-num-avoid-overflow]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Unsigned arithmetic is modulo arithmetic; a result below zero becomes a huge value.

## Why

ES.102 says to use signed types for arithmetic because unsigned arithmetic is modulo arithmetic: when a subtraction should produce a negative value, an unsigned result wraps to a value near the type's maximum, and every later comparison inherits the error. ES.106 warns against the common attempt to avoid this by choosing unsigned for values that "cannot be negative" — the rules for mixed signed and unsigned arithmetic are subtle enough that the avoidance creates the bug it was meant to prevent. Signed types keep ordinary arithmetic ordinary.

## Bad

```cpp
#include <cstddef>

// unsigned chosen because the remaining count "cannot be negative"
std::size_t remaining(std::size_t total, std::size_t used) {
    return total - used; // wraps when used > total
}

int main() {
    return remaining(1, 2) == 0 ? 1 : 0;
}
```

## Good

```cpp
#include <cstddef>
#include <stdexcept>

// signed: a negative result is representable and detectable
std::ptrdiff_t remaining(std::ptrdiff_t total, std::ptrdiff_t used) {
    if (used > total)
        throw std::out_of_range("used exceeds total");
    return total - used;
}

int main() {
    return remaining(5, 3) == 2 ? 0 : 1;
}
```

## See Also

- [cpp-num-no-mixed-sign](num-no-mixed-sign.md) - keeping both operands the same signedness
- [cpp-num-avoid-overflow](num-avoid-overflow.md) - the other arithmetic failure mode
