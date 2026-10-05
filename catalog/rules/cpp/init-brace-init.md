---
id: cpp-init-brace-init
lang: cpp
prefix: init
title: Prefer the brace-initializer syntax
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [list-initialization, braces, narrowing]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-init-nsdmi, cpp-type-no-narrowing]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - List-initialization
    url: https://en.cppreference.com/w/cpp/language/list_initialization
---
> Braces make narrowing an error and remove the parse ambiguities of () and =.

## Why

ES.23 asks to prefer the {} initializer syntax. The list-initialization reference gives the rules: the brace-enclosed initializer list is one of the language's initialization forms, narrowing conversions are prohibited in it — `int bad{1.0};` is ill-formed — and a brace-enclosed initializer list is not an expression and has no type, which removes the most-vexing-parse readings that `T name();` can have. The = and () forms keep their historical conversions and ambiguities.

## Bad

```cpp
struct Widget {
    int id = 1;
};

int main() {
    int count(3.7);  // narrows without complaint
    Widget widget(); // a function declaration, not an object
    return count == 3 ? 0 : 1;
}
```

## Good

```cpp
struct Widget {
    int id = 1;
};

int main() {
    int count{3};    // a narrowing conversion here would be an error
    Widget widget{}; // unambiguously an object
    return count == 3 && widget.id == 1 ? 0 : 1;
}
```

## See Also

- [cpp-init-nsdmi](init-nsdmi.md) - the brace form in member declarations
- [cpp-type-no-narrowing](type-no-narrowing.md) - checking conversions that remain
