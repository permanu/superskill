---
id: cpp-trait-minimal-requirements
lang: cpp
prefix: trait
title: Require only the properties the template uses
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [over-constraining, concepts, requirements]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [concept]
related: [cpp-trait-requires-expression, cpp-trait-standard-concepts]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Constraints and concepts
    url: https://en.cppreference.com/w/cpp/language/constraints
---
> Every extra requirement rejects types the template would have worked with.

## Why

T.41 asks to require only essential properties in a template's concepts. The constraints reference makes each concept a predicate over the arguments, and a conjunction is satisfied only when every operand is: adding copyability to a comparison concept means every move-only type that supports comparison is rejected, even though the function never copies. The check is to read the template body and list exactly the operations and types it uses — no more, no less.

## Bad

```cpp
#include <concepts>

template <class T>
concept comparable = std::copyable<T> && requires(T a, T b) { a < b; }; // extra requirements

template <comparable T>
const T& smaller(const T& a, const T& b) { return a < b ? a : b; }

int main() {
    return smaller(1, 2) == 1 ? 0 : 1;
}
```

## Good

```cpp
template <class T>
concept less_than_comparable = requires(T a, T b) { a < b; }; // only what is used

template <less_than_comparable T>
const T& smaller(const T& a, const T& b) { return a < b ? a : b; }

int main() {
    return smaller(1, 2) == 1 ? 0 : 1;
}
```

## See Also

- [cpp-trait-requires-expression](trait-requires-expression.md) - writing the requirements themselves
- [cpp-trait-standard-concepts](trait-standard-concepts.md) - the standard concepts, with their stated semantics
