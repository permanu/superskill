---
id: cpp-ffi-templates-not-c
lang: cpp
prefix: ffi
title: Expose free functions, not member functions or templates, to C
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [member-functions, templates, c-api, wrappers]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: []
related: [cpp-ffi-no-overloads, cpp-ffi-extern-c]
sources:
  - title: cppreference - Language linkage
    url: https://en.cppreference.com/w/cpp/language/language_linkage
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Member functions and templates keep C++ linkage even inside extern "C".

## Why

The language-linkage reference states the special rule: when class members or non-static member functions appear in a `"C"` language block, the linkage of their types remains `"C++"` — the block cannot give them C linkage. Member functions are therefore never callable from C, and templates are selected by instantiation, a compile-time mechanism C does not have. The C-facing surface is a set of free functions with C linkage; the C++ implementation keeps its members and templates behind them.

## Bad

```cpp
extern "C" {
struct Widget {
    int id;
    int value() const { return id; } // member function: C++ linkage
};
}

int main() {
    return Widget{1}.value() == 1 ? 0 : 1;
}
```

## Good

```cpp
extern "C" {
struct Widget {
    int id;
};

int widget_value(const Widget* widget); // free function: C linkage
}

int main() {
    return 0;
}
```

## See Also

- [cpp-ffi-no-overloads](ffi-no-overloads.md) - the same "one callable name" constraint
- [cpp-ffi-extern-c](ffi-extern-c.md) - the linkage the wrappers carry
