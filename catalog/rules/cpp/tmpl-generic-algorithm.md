---
id: cpp-tmpl-generic-algorithm
lang: cpp
prefix: tmpl
title: Express algorithms once with templates
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [templates, genericity, algorithms, abstraction]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [template]
related: [cpp-tmpl-alias, cpp-tmpl-forwarding-reference]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Templates
    url: https://en.cppreference.com/w/cpp/language/templates
---
> A template defines a family of functions or classes; per-type copies do not.

## Why

T.2 asks to use templates to express algorithms that apply to many argument types. The templates reference describes what a template defines: a family of classes or a family of functions, parameterized by types and values, from which a specialization is obtained when arguments are supplied. Overloads written once per type multiply the code that must stay in sync, while one template carries the same algorithm for every type that satisfies its requirements.

## Bad

```cpp
int add(int a, int b) { return a + b; }
double add(double a, double b) { return a + b; } // one copy per type

int main() {
    return add(1, 2) == 3 ? 0 : 1;
}
```

## Good

```cpp
template <class T>
T add(T a, T b) { return a + b; } // one definition for many types

int main() {
    return add(1, 2) == 3 ? 0 : 1;
}
```

## See Also

- [cpp-tmpl-alias](tmpl-alias.md) - naming families of types the same way
- [cpp-tmpl-forwarding-reference](tmpl-forwarding-reference.md) - passing values generically
