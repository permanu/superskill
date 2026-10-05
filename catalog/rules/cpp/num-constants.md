---
id: cpp-num-constants
lang: cpp
prefix: num
title: Take mathematical constants from std::numbers, not typed-in digits
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constants, pi, numbers, precision]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::numbers]
related: [cpp-num-duration, cpp-perf-constexpr]
sources:
  - title: cppreference - Mathematical constants
    url: https://en.cppreference.com/w/cpp/numeric/constants
---
> A literal is only as precise as it was typed and fixed to one type; the library constant is neither.

## Why

The `<numbers>` header defines variable templates for the mathematical constants, including pi, e, and the square roots, specialized for every floating-point type, plus the `inline constexpr double` constants such as `std::numbers::pi`. A hand-typed `3.14159` carries six digits regardless of the destination type and silently rounds differently in float, double, and long double. The library constant adapts to the type it is used with and cannot be mistyped.

## Bad

```cpp
double circle_area(double radius) {
    return 3.14159 * radius * radius; // truncated constant
}

int main() {
    return circle_area(1.0) > 3.0 ? 0 : 1;
}
```

## Good

```cpp
#include <numbers>

double circle_area(double radius) {
    return std::numbers::pi * radius * radius; // full-precision constant
}

int main() {
    return circle_area(1.0) > 3.0 ? 0 : 1;
}
```

## See Also

- [cpp-num-duration](num-duration.md) - the same idea for units
- [cpp-perf-constexpr](perf-constexpr.md) - constant evaluation of such expressions
