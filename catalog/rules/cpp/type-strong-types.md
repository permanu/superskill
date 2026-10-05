---
id: cpp-type-strong-types
lang: cpp
prefix: type
title: Give distinct meanings distinct types instead of sharing a built-in type
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [strong-types, units, identifiers, interface]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [enum class, struct]
related: [cpp-type-parse-at-boundary, cpp-type-class-invariant]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Wrap each distinct meaning in its own type so unrelated values cannot be substituted.

## Why

When two concepts share `int` or `std::string`, the compiler cannot tell them apart: arguments silently swap at call sites, units get mixed, and a name is accepted where an id belongs. A distinct type makes those errors compile errors, and the type name documents the meaning at every use. The wrapper is zero-cost: it carries no more data than the value it protects.

## Bad

```cpp
struct Order { int id; };

// Bad: both parameters are ints and can be swapped silently.
void refund(int user_id, int order_id);

int main() {
    refund(7, 42); // which argument is which?
}
```

## Good

```cpp
struct UserId { int value; };
struct OrderId { int value; };

void refund(UserId user, OrderId order);

int main() {
    refund(UserId{7}, OrderId{42}); // cannot swap by accident
}
```

## See Also

- [cpp-type-parse-at-boundary](type-parse-at-boundary.md) - producing these types from external input
- [cpp-type-class-invariant](type-class-invariant.md) - protecting the invariant inside the type
