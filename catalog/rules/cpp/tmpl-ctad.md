---
id: cpp-tmpl-ctad
lang: cpp
prefix: tmpl
title: Let class template arguments be deduced from the initializer
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ctad, deduction-guides, class-template]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-tmpl-alias, cpp-tmpl-generic-algorithm]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Class template argument deduction
    url: https://en.cppreference.com/w/cpp/language/class_template_argument_deduction
---
> When the initializer already names the types, CTAD removes the repetition.

## Why

T.44 asks to use function templates to deduce class template argument types where feasible. The CTAD reference describes the language feature that does this directly: in a declaration whose type is the class template name without an argument list, the compiler deduces the arguments from the initializer, using implicitly generated deduction guides from the constructors and any user-defined guides. Writing the arguments out again is repetition that can drift from the initializer; CTAD keeps one source of truth.

## Bad

```cpp
#include <utility>

int main() {
    std::pair<int, double> point(1, 2.5); // types repeated from the arguments
    return point.first == 1 ? 0 : 1;
}
```

## Good

```cpp
#include <utility>

int main() {
    std::pair point(1, 2.5); // deduced as std::pair<int, double>
    return point.first == 1 ? 0 : 1;
}
```

## See Also

- [cpp-tmpl-alias](tmpl-alias.md) - the other way template names get shorter
- [cpp-tmpl-generic-algorithm](tmpl-generic-algorithm.md) - deduction in function templates
