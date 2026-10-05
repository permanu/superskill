---
id: cpp-num-midpoint
lang: cpp
prefix: num
title: Average two values with std::midpoint, not (a + b) / 2
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [midpoint, average, overflow, interpolation]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::midpoint]
related: [cpp-num-avoid-overflow, cpp-num-intcmp]
sources:
  - title: cppreference - std::midpoint
    url: https://en.cppreference.com/w/cpp/numeric/midpoint
  - title: cppreference - std::numeric_limits
    url: https://en.cppreference.com/w/cpp/types/numeric_limits
---
> (a + b) can overflow even when the average is representable; midpoint cannot.

## Why

For two large values of the same sign, `(a + b)` exceeds the type's range even though the midpoint is representable: `(low + high) / 2` with both near the maximum computes the sum first and invokes signed overflow. `std::midpoint` returns half the sum with no overflow, and the reference specifies the rounding as well — toward `a` for odd integer sums and with at most one inexact operation for floating-point values. It is the portable spelling of the average.

## Bad

```cpp
int average(int low, int high) {
    return (low + high) / 2; // overflows before dividing
}

int main() {
    return average(2'000'000'000, 2'000'000'000) == 2'000'000'000 ? 0 : 1;
}
```

## Good

```cpp
#include <numeric>

int average(int low, int high) {
    return std::midpoint(low, high); // no overflow occurs
}

int main() {
    return average(2'000'000'000, 2'000'000'000) == 2'000'000'000 ? 0 : 1;
}
```

## See Also

- [cpp-num-avoid-overflow](num-avoid-overflow.md) - the guard-first approach to the same hazard
- [cpp-num-intcmp](num-intcmp.md) - another arithmetic trap with a standard answer
