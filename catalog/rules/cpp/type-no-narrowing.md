---
id: cpp-type-no-narrowing
lang: cpp
prefix: type
title: Do not narrow numeric values implicitly; range-check and convert explicitly
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [narrowing, conversion, range, overflow]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [static_cast, std::numeric_limits]
related: [cpp-type-strong-types]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Convert between numeric types only after checking the value fits; never let a widening or truncating conversion happen silently.

## Why

An implicit narrowing conversion discards information without a diagnostic: `double` to `int` truncates the fraction, and a value outside the target's range is undefined behavior for floating-point to integer. The bug is invisible at the conversion site and surfaces later as a wrong result. An explicit range check turns the loss into a handled failure, and the cast then documents that the value is known to fit.

## Bad

```cpp
int to_int(double value) {
    return value; // truncates 3.9 to 3; out-of-range is undefined behavior
}

int main() {
    return to_int(3.9);
}
```

## Good

```cpp
#include <cmath>
#include <limits>
#include <stdexcept>

int to_int(double value) {
    if (value < std::numeric_limits<int>::min() ||
        value > std::numeric_limits<int>::max())
        throw std::out_of_range("value does not fit in int");
    return static_cast<int>(std::lround(value));
}

int main() {
    return to_int(3.9);
}
```

## See Also

- [cpp-type-strong-types](type-strong-types.md) - typed values that make unit mistakes compile errors
