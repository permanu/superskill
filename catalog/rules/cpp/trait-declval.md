---
id: cpp-trait-declval
lang: cpp
prefix: trait
title: Use std::declval for hypothetical values in traits
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [declval, unevaluated-context, decltype]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [declval]
related: [cpp-tmpl-dependent-names, cpp-trait-requires-expression]
sources:
  - title: cppreference - std::declval
    url: https://en.cppreference.com/w/cpp/utility/declval
---
> declval produces an expression of type T without constructing one.

## Why

The declval reference defines the helper: in unevaluated contexts it converts any type T — which may be an incomplete type — to an expression of that type, making it possible to use member functions of T without going through constructors; it is commonly used in templates where acceptable arguments have no constructor in common but share a member function whose return type is needed. Constructing a temporary in the trait instead demands default-constructibility that the actual use never required, and breaks for abstract and non-default-constructible types.

## Bad

```cpp
#include <type_traits>

template <class T>
using add_result = decltype(T{} + T{}); // demands default-constructibility

int main() {
    return 0;
}
```

## Good

```cpp
#include <type_traits>
#include <utility>

template <class T>
using add_result = decltype(std::declval<T>() + std::declval<T>()); // hypothetical values

int main() {
    return 0;
}
```

## See Also

- [cpp-tmpl-dependent-names](tmpl-dependent-names.md) - the unevaluated contexts these types live in
- [cpp-trait-requires-expression](trait-requires-expression.md) - stating the same operations as requirements
