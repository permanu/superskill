---
id: cpp-tmpl-forwarding-greedy
lang: cpp
prefix: tmpl
title: Do not leave widely used templates unconstrained
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [forwarding-reference, overload-resolution, constraints]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [requires]
related: [cpp-tmpl-forwarding-reference, cpp-trait-standard-concepts]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Template argument deduction
    url: https://en.cppreference.com/w/cpp/language/template_argument_deduction
---
> An unconstrained T&& binds everything and outranks more specific overloads.

## Why

T.47 asks to avoid highly visible unconstrained templates with common names. The deduction reference shows why a forwarding reference is the worst offender: T&& deduces a reference that binds any argument, and the deduced binding is preferred over the cv-qualified reference of a more specific overload, so the template silently takes calls meant for the concrete function. A constraint narrows the template to the types it is actually for, and unsatisfied constraints remove it from the candidate set.

## Bad

```cpp
#include <string>

template <class T>
std::string describe(T&& value) { // matches everything, including strings
    return "generic";
}

std::string describe(const std::string& value) { return value; }

int main() {
    return describe(std::string{"x"}) == "x" ? 0 : 1; // picks the template
}
```

## Good

```cpp
#include <concepts>
#include <string>
#include <type_traits>

template <class T>
    requires (!std::same_as<std::remove_cvref_t<T>, std::string>)
std::string describe(T&& value) { // stands aside for strings
    return "generic";
}

std::string describe(const std::string& value) { return value; }

int main() {
    return describe(std::string{"x"}) == "x" ? 0 : 1;
}
```

## See Also

- [cpp-tmpl-forwarding-reference](tmpl-forwarding-reference.md) - the parameter form itself
- [cpp-trait-standard-concepts](trait-standard-concepts.md) - the concepts used to constrain it
