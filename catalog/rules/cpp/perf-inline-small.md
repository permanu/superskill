---
id: cpp-perf-inline-small
lang: cpp
prefix: perf
title: Define small time-critical functions where the compiler can inline them
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [inline, small-functions, header, optimizer]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [inline]
related: [cpp-perf-measure-first, cpp-perf-static-dispatch]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Put small hot functions in headers or define them in-class so cross-unit calls can inline.

## Why

A function defined in one translation unit cannot be inlined into another unless the definition is visible; a small accessor or arithmetic helper hidden in a `.cpp` file becomes a call on every hot iteration. Defining it in the header, or inside the class definition where it is implicitly `inline`, gives the optimizer the body it needs. The guideline is explicit that inlining hints should follow measurement, not replace it.

## Bad

```cpp
// widget.cpp: the body is invisible to every other translation unit.
struct Point {
    double x;
    double y;
    double norm_squared() const; // call per access in hot loops
};

double Point::norm_squared() const {
    return x * x + y * y;
}
```

## Good

```cpp
// widget.hpp: the definition is visible, so calls can be inlined.
struct Point {
    double x;
    double y;
    double norm_squared() const { return x * x + y * y; } // implicitly inline
};
```

## See Also

- [cpp-perf-measure-first](perf-measure-first.md) - measure before adding inline hints
- [cpp-perf-static-dispatch](perf-static-dispatch.md) - visibility as a prerequisite for optimization
