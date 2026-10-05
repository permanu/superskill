---
id: cpp-perf-static-dispatch
lang: cpp
prefix: perf
title: Prefer static dispatch in hot paths when the type set is known at compile time
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [virtual, dispatch, template, hot-path]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [virtual]
related: [cpp-perf-measure-first, cpp-api-abstract-interface]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Use templates for hot loops over known types; virtual dispatch is for runtime openness.

## Why

A virtual call is an indirect branch that the optimizer cannot see through, so it blocks inlining and the constant propagation that follows from it. When the set of types is fixed at compile time, a template resolves the call statically and the loop body can be inlined and vectorized. Keep virtual dispatch where types genuinely arrive at run time; choose static dispatch where the alternative is a loop over one known representation.

## Bad

```cpp
struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

struct Square : Shape {
    double side;
    double area() const override { return side * side; }
};

double total_area(const Shape* const* shapes, int count) {
    double total = 0;
    for (int i = 0; i < count; ++i)
        total += shapes[i]->area(); // indirect call per element
    return total;
}
```

## Good

```cpp
struct Square {
    double side;
    double area() const { return side * side; }
};

template <class Shape>
double total_area(const Shape* shapes, int count) {
    double total = 0;
    for (int i = 0; i < count; ++i)
        total += shapes[i].area(); // resolved and inlined at compile time
    return total;
}
```

## See Also

- [cpp-perf-measure-first](perf-measure-first.md) - confirming dispatch is the bottleneck
- [cpp-api-abstract-interface](api-abstract-interface.md) - when runtime dispatch is the right design
