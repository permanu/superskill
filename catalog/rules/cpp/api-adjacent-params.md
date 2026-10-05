---
id: cpp-api-adjacent-params
lang: cpp
prefix: api
title: Avoid adjacent parameters of the same type that can be swapped silently
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [parameters, same-type, swap, strong-types]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-type-strong-types, cpp-api-few-arguments]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Give same-typed adjacent parameters distinct types so a transposition cannot compile.

## Why

Two adjacent `int` parameters accept each other's values, so swapping them at a call site is a silent bug the compiler cannot see. Distinct wrapper types turn that swap into a type error, and they document each position at the same time. When the values are genuinely one concept, grouping them into a struct removes the ordering question entirely.

## Bad

```cpp
// Bad: left and right are both ints; swapping them compiles and misbehaves.
void set_window(int left, int right);
```

## Good

```cpp
struct Left {
    int value;
};

struct Right {
    int value;
};

void set_window(Left left, Right right); // transposition is a compile error
```

## See Also

- [cpp-type-strong-types](type-strong-types.md) - the general strong-type rule
- [cpp-api-few-arguments](api-few-arguments.md) - grouping values that belong together
