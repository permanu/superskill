---
id: cpp-num-intcmp
lang: cpp
prefix: num
title: Compare across signedness with std::cmp_less, not a cast
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [comparison, signed, unsigned, cast]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::cmp_less]
related: [cpp-num-no-mixed-sign, cpp-num-limits]
sources:
  - title: cppreference - integer comparison functions
    url: https://en.cppreference.com/w/cpp/utility/intcmp
  - title: cppreference - std::numeric_limits
    url: https://en.cppreference.com/w/cpp/types/numeric_limits
---
> The cmp functions compare mathematical values; a cast changes the value.

## Why

When a comparison genuinely spans signedness, the builtin operators convert the signed operand to unsigned, so `-1 < 0u` is false; casting first makes the same change explicitly and hides it. The `std::cmp_less` family compares the values instead: the reference states that negative signed integers always compare less than unsigned integers and that the comparison is safe against non-value-preserving conversion. The helpers are constexpr and noexcept, so they work in the same places the operator did.

## Bad

```cpp
int main() {
    const int depth = -1;
    const unsigned int limit = 10;
    return static_cast<unsigned int>(depth) < limit ? 0 : 1; // cast hides the change
}
```

## Good

```cpp
#include <utility>

int main() {
    const int depth = -1;
    const unsigned int limit = 10;
    return std::cmp_less(depth, limit) ? 0 : 1; // compares mathematical values
}
```

## See Also

- [cpp-num-no-mixed-sign](num-no-mixed-sign.md) - avoiding the situation entirely
- [cpp-num-limits](num-limits.md) - the bounds that make cross-type comparisons real
