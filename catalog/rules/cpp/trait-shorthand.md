---
id: cpp-trait-shorthand
lang: cpp
prefix: trait
title: Use the shorthand form for single-type concepts
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [abbreviated-template, placeholder, concepts]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [auto]
related: [cpp-trait-constrain-templates, cpp-trait-standard-concepts]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Constraints and concepts
    url: https://en.cppreference.com/w/cpp/language/constraints
---
> A constrained auto parameter says the same thing without a template head.

## Why

T.13 asks to prefer the shorthand notation for simple, single-type argument concepts. The constraints reference lists constrained `auto` among the places a concept can appear as a type-constraint: the abbreviated function template `void f(std::integral auto x)` is the same template as the `template <class T> requires std::integral<T>` declaration, with the constraint attached where the parameter is used. The shorthand keeps the requirement next to the parameter and removes a template parameter that appears exactly once.

## Bad

```cpp
#include <concepts>

template <class T>
    requires std::integral<T>
T square(T value) { return value * value; }

int main() {
    return square(3) == 9 ? 0 : 1;
}
```

## Good

```cpp
#include <concepts>

int square(std::integral auto value) { return value * value; } // shorthand

int main() {
    return square(3) == 9 ? 0 : 1;
}
```

## See Also

- [cpp-trait-constrain-templates](trait-constrain-templates.md) - the full requires-clause form
- [cpp-trait-standard-concepts](trait-standard-concepts.md) - where the concept comes from
