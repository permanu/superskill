---
id: cpp-num-no-mixed-sign
lang: cpp
prefix: num
title: Do not mix signed and unsigned values in one expression
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sign-compare, conversion, arithmetic, mixed]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-num-intcmp, cpp-num-signed-arithmetic]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> The signed operand converts to unsigned; -1 becomes the largest value of the type.

## Why

ES.100 says not to mix signed and unsigned arithmetic. In a mixed expression the signed operand is converted to the unsigned type, so a negative value becomes a huge positive one and comparisons invert: `-1 < 10u` is false. The conversion happens silently at the operator, far from the declaration where the type was chosen, which is why the rule asks for one signedness per expression rather than care at each use.

## Bad

```cpp
int main() {
    const int depth = -1;
    const unsigned int limit = 10;
    return (depth < limit) ? 0 : 1; // -1 converts to a huge unsigned value
}
```

## Good

```cpp
int main() {
    const int depth = -1;
    const int limit = 10; // same signedness on both sides
    return (depth < limit) ? 0 : 1;
}
```

## See Also

- [cpp-num-intcmp](num-intcmp.md) - comparing across signedness when it cannot be avoided
- [cpp-num-signed-arithmetic](num-signed-arithmetic.md) - choosing the type in the first place
