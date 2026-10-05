---
id: cpp-init-defaulted-ctor
lang: cpp
prefix: init
title: Use = default for the default semantics
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [default-constructor, defaulted, special-members]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-init-delegating, cpp-raii-rule-of-zero]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Default constructors
    url: https://en.cppreference.com/w/cpp/language/default_constructor
---
> An empty user-provided constructor is not the same as a defaulted one.

## Why

C.80 asks to use =default if you have to be explicit about using the default semantics. The default constructor reference shows what changes: a user-provided constructor is not trivial, class types with an empty user-provided constructor may be treated differently during value initialization, and the explicitly-defaulted form keeps the implicit definition and its exception specification. When the intent is the compiler's default behavior, = default states it without altering it.

## Bad

```cpp
struct Widget {
    int id = 0;
    Widget() {} // user-provided: not the same as the implicit one
};

int main() {
    Widget widget;
    return widget.id == 0 ? 0 : 1;
}
```

## Good

```cpp
struct Widget {
    int id = 0;
    Widget() = default; // explicit about the default semantics
};

int main() {
    Widget widget;
    return widget.id == 0 ? 0 : 1;
}
```

## See Also

- [cpp-init-delegating](init-delegating.md) - when a constructor does have work to share
- [cpp-raii-rule-of-zero](raii-rule-of-zero.md) - owning through members, declaring nothing
