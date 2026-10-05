---
id: cpp-tmpl-specialize-function
lang: cpp
prefix: tmpl
title: Overload function templates instead of specializing them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [specialization, function-template, overloads]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [template]
related: [cpp-tmpl-specialization, cpp-tmpl-tag-dispatch]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Explicit (full) template specialization
    url: https://en.cppreference.com/w/cpp/language/template_specialization
---
> A function specialization is only found after the primary template wins overload resolution.

## Why

T.144 is "Don't specialize function templates". The specialization reference shows the trap: a function with the same name and the same argument list as a specialization is not a specialization at all, and a specialization is used only once overload resolution has selected the primary template for its arguments. An overload, by contrast, participates in the candidate set, can be more specialized, can be found by argument-dependent lookup, and reports ambiguity when the rules do not agree.

## Bad

```cpp
template <class T>
void print(const T& value) { (void)value; }

template <>
void print<int>(const int& value) { (void)value; } // specialization

int main() {
    print(42);
    return 0;
}
```

## Good

```cpp
template <class T>
void print(const T& value) { (void)value; }

void print(int value) { (void)value; } // overload participates in resolution

int main() {
    print(42);
    return 0;
}
```

## See Also

- [cpp-tmpl-specialization](tmpl-specialization.md) - where specialization belongs
- [cpp-tmpl-tag-dispatch](tmpl-tag-dispatch.md) - choosing among overloads by tag
