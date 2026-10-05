---
id: cpp-trait-constrain-templates
lang: cpp
prefix: trait
title: State the requirements of every template parameter
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constraints, requires-clause, templates]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [requires]
related: [cpp-trait-standard-concepts, cpp-trait-requires-expression]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Constraints and concepts
    url: https://en.cppreference.com/w/cpp/language/constraints
---
> An unconstrained template accepts every type and reports the failure deep inside.

## Why

T.10 asks to specify concepts for all template arguments. The constraints reference explains what a constraint buys: the associated constraints are checked early in the instantiation process, and the diagnostic names the concept that was not satisfied instead of a wall of errors from the template body — its example contrasts the two forms of the same std::sort failure. An unconstrained template defers the discovery of a bad argument to whatever expression inside the body happens to fail first.

## Bad

```cpp
template <class T>
T half(T value) { return value / 2; } // accepts anything; fails deep inside

int main() {
    return half(4) == 2 ? 0 : 1;
}
```

## Good

```cpp
#include <concepts>

template <class T>
    requires std::integral<T> || std::floating_point<T>
T half(T value) { return value / 2; }

int main() {
    return half(4) == 2 ? 0 : 1;
}
```

## See Also

- [cpp-trait-standard-concepts](trait-standard-concepts.md) - the concepts to reach for first
- [cpp-trait-requires-expression](trait-requires-expression.md) - stating ad-hoc requirements
