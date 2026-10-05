---
id: cpp-anti-magic-constants
lang: cpp
prefix: anti
title: Replace magic constants with named ones
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [magic-numbers, constants, readability]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [constexpr]
related: [cpp-init-declare-at-use, cpp-num-constants]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - constexpr specifier
    url: https://en.cppreference.com/w/cpp/language/constexpr
---
> A bare literal carries no meaning and no single place to change.

## Why

ES.45 asks to avoid magic constants and use symbolic constants. The constexpr reference defines the tool: a constexpr variable declares that its value can be evaluated at compile time, so a named constant participates in constant expressions exactly like the literal it replaces — same code generation, but the name carries the meaning and the definition is one place to change. A bare number repeated in expressions has neither property, and the copies drift apart.

## Bad

```cpp
double discount(double price) {
    return price * 0.85; // what is 0.85?
}

int main() {
    return discount(100.0) == 85.0 ? 0 : 1;
}
```

## Good

```cpp
constexpr double member_discount = 0.85; // named: the meaning is part of the code

double discount(double price) {
    return price * member_discount;
}

int main() {
    return discount(100.0) == 85.0 ? 0 : 1;
}
```

## See Also

- [cpp-init-declare-at-use](init-declare-at-use.md) - declaring the constant where it is used
- [cpp-num-constants](num-constants.md) - standard constants instead of typed-in digits
