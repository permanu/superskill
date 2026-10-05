---
id: cpp-trait-check-class
lang: cpp
prefix: trait
title: Assert which concepts a class models
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static-assert, concepts, class-contract]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [static_assert]
related: [cpp-trait-standard-concepts, cpp-tmpl-specialization]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Concepts library
    url: https://en.cppreference.com/w/cpp/concepts
---
> A static_assert turns "this class is meant to be equality comparable" into a check.

## Why

T.150 asks to check that a class matches a concept using static_assert. The concepts library reference describes concepts as compile-time validation of template arguments and dispatch based on type properties; the standard concepts such as equality_comparable state syntactic and semantic requirements. Placing the assertion next to the class declares the model the type is meant to provide, so a signature drift — a comparison that stops returning bool, an operator that loses const — fails at the class instead of at some distant instantiation.

## Bad

```cpp
struct Widget { // equality exists, but nothing declares the model
    int id;
    bool operator==(const Widget& other) const { return id == other.id; }
};

int main() {
    Widget a{1};
    Widget b{1};
    return a == b ? 0 : 1;
}
```

## Good

```cpp
#include <concepts>

struct Widget {
    int id;
    bool operator==(const Widget& other) const { return id == other.id; }
};

static_assert(std::equality_comparable<Widget>); // the class states what it models

int main() {
    return 0;
}
```

## See Also

- [cpp-trait-standard-concepts](trait-standard-concepts.md) - the concepts a class can model
- [cpp-tmpl-specialization](tmpl-specialization.md) - specializing when a type does not fit
