---
id: cpp-trait-enable-if-legacy
lang: cpp
prefix: trait
title: Use enable_if only where concepts are unavailable
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enable-if, sfinae, legacy-constraints]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [enable_if]
related: [cpp-trait-v-suffix, cpp-trait-constrain-templates]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::enable_if
    url: https://en.cppreference.com/w/cpp/types/enable_if
---
> enable_if removes candidates by substitution failure; concepts say why.

## Why

T.48 says that if your compiler does not support concepts, fake them with enable_if. The enable_if reference frames it the same way: the metafunction is a convenient way to leverage SFINAE prior to C++20's concepts, by giving the specialization no member type and thereby removing the overload from the candidate set. Modern code states the requirement as a constraint, which documents itself, composes with subsumption, and produces a diagnostic naming the unmet requirement; enable_if remains for code that must compile as C++17.

## Bad

```cpp
#include <type_traits>

template <class T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
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

- [cpp-trait-v-suffix](trait-v-suffix.md) - the _t and _v helpers this form relies on
- [cpp-trait-constrain-templates](trait-constrain-templates.md) - the replacement
