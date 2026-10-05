---
id: cpp-type-override
lang: cpp
prefix: type
title: Mark every virtual override with exactly one of virtual, override, or final
severity: should
enforce: both
tool: clang:-Woverloaded-virtual
baseline: latest
status: verified
triggers:
  keywords: [virtual, override, final, inheritance]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [override, virtual, final]
related: [cpp-type-regular-value-types, cpp-type-class-invariant]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Write override on every overriding function; use virtual only at the introduction of a new interface.

## Why

A function intended as an override but missing `override` compiles as a new function when the signature differs by constness, parameter type, or reference qualification, so the base implementation runs and the bug is silent. `override` makes the compiler verify that a base virtual exists and that the signatures match. Repeating `virtual` on overrides adds noise, and `final` is reserved for functions that must not be overridden further.

## Bad

```cpp
struct Shape {
    virtual double area() const { return 0.0; }
    virtual ~Shape() = default;
};

struct Circle : Shape {
    double area() { return 3.14; } // missing const: does not override
};

int main() {
    Circle circle;
    return static_cast<int>(circle.area());
}
```

## Good

```cpp
struct Shape {
    virtual double area() const { return 0.0; }
    virtual ~Shape() = default;
};

struct Circle : Shape {
    double area() const override { return 3.14; } // compiler checks the signature
};

int main() {
    Circle circle;
    return static_cast<int>(circle.area());
}
```

## See Also

- [cpp-type-regular-value-types](type-regular-value-types.md) - prefer value types before hierarchies
- [cpp-type-class-invariant](type-class-invariant.md) - invariants that base classes must keep
