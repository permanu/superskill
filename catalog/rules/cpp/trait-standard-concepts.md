---
id: cpp-trait-standard-concepts
lang: cpp
prefix: trait
title: Use standard concepts before inventing new ones
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [concepts, standard-library, requirements]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [concept]
related: [cpp-trait-constrain-templates, cpp-tmpl-forwarding-greedy]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Concepts library
    url: https://en.cppreference.com/w/cpp/concepts
---
> The concepts library already names the fundamental requirements; reuse the names.

## Why

T.11 asks to use standard concepts whenever possible. The concepts library reference lists what is available: same_as and derived_from, convertible_to, integral and floating_point, constructible_from and default_initializable, equality_comparable and totally_ordered, movable, copyable, semiregular, regular, invocable, predicate, and more — each imposing syntactic and semantic requirements. A hand-written concept with the same intent gets a different name, weaker checks, and no subsumption relationship with the standard one.

## Bad

```cpp
template <class T>
concept integral_like = requires(T value) { value + value; }; // weaker than std::integral

template <integral_like T>
T twice(T value) { return value + value; }

int main() {
    return twice(2) == 4 ? 0 : 1;
}
```

## Good

```cpp
#include <concepts>

template <std::integral T>
T twice(T value) { return value + value; }

int main() {
    return twice(2) == 4 ? 0 : 1;
}
```

## See Also

- [cpp-trait-constrain-templates](trait-constrain-templates.md) - putting concepts on template parameters
- [cpp-tmpl-forwarding-greedy](tmpl-forwarding-greedy.md) - the standard concept used as a constraint
