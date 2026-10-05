---
id: cpp-num-divide-zero
lang: cpp
prefix: num
title: Never divide by a divisor that can be zero
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [division, zero, arithmetic]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-num-avoid-overflow, cpp-sec-bounds-checked]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Integer division by zero is undefined behavior; reject the divisor before the operation.

## Why

ES.105 is one line: don't divide by integer zero, because it is undefined behavior. A divisor that arrives as a parameter or a count is legitimately zero on an empty input, so the check belongs at the division site rather than at one caller. Rejecting the zero divisor with an exception or an error result keeps the failure at the boundary and turns an undefined operation into a stated precondition.

## Bad

```cpp
int average(int total, int count) {
    return total / count; // count may be zero
}

int main() {
    return average(6, 0) == 0 ? 1 : 0;
}
```

## Good

```cpp
#include <stdexcept>

int average(int total, int count) {
    if (count == 0)
        throw std::invalid_argument("empty set has no average");
    return total / count;
}

int main() {
    return average(6, 3) == 2 ? 0 : 1;
}
```

## See Also

- [cpp-num-avoid-overflow](num-avoid-overflow.md) - the other undefined arithmetic operation
- [cpp-sec-bounds-checked](sec-bounds-checked.md) - rejecting bad values at the boundary
