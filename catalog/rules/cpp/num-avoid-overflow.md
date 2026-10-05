---
id: cpp-num-avoid-overflow
lang: cpp
prefix: num
title: Check arithmetic operands before they can overflow or underflow
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [overflow, underflow, limits, arithmetic]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::numeric_limits]
related: [cpp-num-divide-zero, cpp-num-limits]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Signed overflow and underflow are undefined behavior; bound the operands first.

## Why

ES.103 and ES.104 are blunt: don't overflow, don't underflow. For signed integers these are undefined behavior, not wraparound, so a compiler may assume they never happen and optimize the check away. The guard compares each operand against `numeric_limits` before the operation: for addition, `a > max() - b` means the sum cannot be represented, and the symmetric test with `min()` catches underflow. Failing loudly at the guard is far cheaper than a corrupted result later.

## Bad

```cpp
int total(int a, int b) {
    return a + b; // signed overflow is undefined behavior
}

int main() {
    return total(1, 2) == 3 ? 0 : 1;
}
```

## Good

```cpp
#include <limits>
#include <stdexcept>

int total(int a, int b) {
    if (b > 0 && a > std::numeric_limits<int>::max() - b)
        throw std::overflow_error("addition overflows");
    if (b < 0 && a < std::numeric_limits<int>::min() - b)
        throw std::overflow_error("addition underflows");
    return a + b;
}

int main() {
    return total(1, 2) == 3 ? 0 : 1;
}
```

## See Also

- [cpp-num-divide-zero](num-divide-zero.md) - the other undefined arithmetic operation
- [cpp-num-limits](num-limits.md) - the bounds this check reads
