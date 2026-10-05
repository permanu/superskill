---
id: cpp-type-enum-class
lang: cpp
prefix: type
title: Use enum class instead of unscoped enums for named constants
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enum, scoped, constants, conversion]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [enum class]
related: [cpp-type-strong-types, cpp-type-variant-over-union]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Enumeration declaration
    url: https://en.cppreference.com/w/cpp/language/enum
---
> Declare enums as enum class so enumerators are scoped and never convert to integers implicitly.

## Why

Unscoped enumerators leak into the enclosing scope, collide with other names, and convert to `int` in any expression, so a wrong enum or a raw integer slips through overload resolution. `enum class` scopes each enumerator under the enum name and removes the implicit conversion; passing an integer where an enum is expected becomes a compile error that must be cast deliberately.

## Bad

```cpp
enum Color { red, green, blue };

void paint(int color);

int main() {
    paint(red); // converts to int silently
    paint(2);   // any int is accepted
}
```

## Good

```cpp
enum class Color { red, green, blue };

void paint(Color color);

int main() {
    paint(Color::red);
    // paint(2); // error: int does not convert to Color
}
```

## See Also

- [cpp-type-strong-types](type-strong-types.md) - the general rule this specializes
- [cpp-type-variant-over-union](type-variant-over-union.md) - typed alternatives for value sets
