---
id: cpp-num-limits
lang: cpp
prefix: num
title: Query numeric bounds with std::numeric_limits, not C macros
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [limits, macros, bounds, range]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::numeric_limits]
related: [cpp-num-avoid-overflow, cpp-type-no-narrowing]
sources:
  - title: cppreference - std::numeric_limits
    url: https://en.cppreference.com/w/cpp/types/numeric_limits
---
> The typed query follows the type; the macro must be matched by hand.

## Why

`std::numeric_limits` provides a standardized way to query properties of arithmetic types, with specializations for every arithmetic type, and the reference maps each C macro to its member: `SHRT_MAX` to `numeric_limits<short>::max()`, `INT_MIN` to `min()`, and so on. A macro written for one type but used against another is a silent mismatch, and macros express only the extreme the header chose, while the template offers `lowest()`, `digits`, and the rest with the same spelling for every type.

## Bad

```cpp
#include <climits>

bool fits_in_short(long value) {
    return value <= SHRT_MAX; // C macro; no lower bound checked
}

int main() {
    return fits_in_short(10) ? 0 : 1;
}
```

## Good

```cpp
#include <limits>

bool fits_in_short(long value) {
    return value <= std::numeric_limits<short>::max()
        && value >= std::numeric_limits<short>::min();
}

int main() {
    return fits_in_short(10) ? 0 : 1;
}
```

## See Also

- [cpp-num-avoid-overflow](num-avoid-overflow.md) - using these bounds in guards
- [cpp-type-no-narrowing](type-no-narrowing.md) - the conversion this range check protects
