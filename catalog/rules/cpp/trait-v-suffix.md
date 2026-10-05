---
id: cpp-trait-v-suffix
lang: cpp
prefix: trait
title: Use the _v and _t helper forms of type traits
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [type-traits, variable-templates, helper-types]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [is_integral]
related: [cpp-trait-enable-if-legacy, cpp-trait-standard-concepts]
sources:
  - title: cppreference - std::is_integral
    url: https://en.cppreference.com/w/cpp/types/is_integral
  - title: cppreference - Constraints and concepts
    url: https://en.cppreference.com/w/cpp/language/constraints
---
> is_integral_v<T> is the trait's value; the ::value spelling is noise.

## Why

The is_integral reference documents both spellings side by side: the class template with its member constant value, and the helper variable template is_integral_v, which the page's own example uses — `std::is_integral_v<float> == false`. The `_v` form names the value directly, and the `_t` forms (enable_if_t, remove_cvref_t) name the type, so constraints and static_asserts read as the property being tested rather than as member access into a metafunction.

## Bad

```cpp
#include <type_traits>

template <class T>
void check() {
    static_assert(std::is_integral<T>::value, "need an integer");
}

int main() {
    check<int>();
    return 0;
}
```

## Good

```cpp
#include <type_traits>

template <class T>
void check() {
    static_assert(std::is_integral_v<T>, "need an integer");
}

int main() {
    check<int>();
    return 0;
}
```

## See Also

- [cpp-trait-enable-if-legacy](trait-enable-if-legacy.md) - the _t helper in its classic role
- [cpp-trait-standard-concepts](trait-standard-concepts.md) - the concept form of the same checks
