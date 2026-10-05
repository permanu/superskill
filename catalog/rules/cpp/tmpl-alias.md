---
id: cpp-tmpl-alias
lang: cpp
prefix: tmpl
title: Name families of types with alias templates
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [alias-template, using, notation]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [using]
related: [cpp-tmpl-generic-algorithm, cpp-type-strong-types]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Type alias, alias template
    url: https://en.cppreference.com/w/cpp/language/type_alias
---
> An alias template names a family of types; a wrapper struct only carries one.

## Why

T.42 asks to use template aliases to simplify notation and hide implementation details. The type-alias reference states that an alias template is a name that refers to a family of types, equivalent to substituting its arguments into the aliased type — and unlike a typedef, it can take template parameters. A wrapper struct with a member typedef does the same job through an extra name and an extra level of syntax; the alias template names the family directly and cannot be mistaken for a class.

## Bad

```cpp
#include <vector>

template <class T>
struct Grid {
    using type = std::vector<std::vector<T>>; // a struct only to name a type
};

int main() {
    Grid<int>::type cells{{1, 2}, {3}};
    return cells.size() == 2 ? 0 : 1;
}
```

## Good

```cpp
#include <vector>

template <class T>
using Grid = std::vector<std::vector<T>>; // alias template names the family directly

int main() {
    Grid<int> cells{{1, 2}, {3}};
    return cells.size() == 2 ? 0 : 1;
}
```

## See Also

- [cpp-tmpl-generic-algorithm](tmpl-generic-algorithm.md) - the function-side counterpart
- [cpp-type-strong-types](type-strong-types.md) - when a new name deserves a new type
