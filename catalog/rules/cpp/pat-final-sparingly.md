---
id: cpp-pat-final-sparingly
lang: cpp
prefix: pat
title: Use final on classes sparingly
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [final, inheritance, extension]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [final]
related: [cpp-api-abstract-interface, cpp-type-override]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - virtual function specifier
    url: https://en.cppreference.com/w/cpp/language/virtual
---
> final closes an extension point; close it only when the design requires it.

## Why

C.139 asks to use final on classes sparingly. The virtual reference describes the extension point that final removes: virtual functions preserve overriding behavior even when the object is handled through a base pointer or reference, and the final specifier makes a further override ill-formed. Marking a class final to catch a mistake or to help an optimizer closes the door for every future use — including the test double and the derived class someone needed — so it belongs only where derivation is genuinely forbidden.

## Bad

```cpp
struct Base final { // final: no further extension is possible
    virtual int value() const { return 1; }
};

int main() {
    Base base;
    return base.value() == 1 ? 0 : 1;
}
```

## Good

```cpp
struct Base { // extendable
    virtual int value() const { return 1; }
    virtual ~Base() = default;
};

struct Derived : Base {
    int value() const override { return 2; }
};

int main() {
    Derived derived;
    return derived.value() == 2 ? 0 : 1;
}
```

## See Also

- [cpp-api-abstract-interface](api-abstract-interface.md) - interfaces built for extension
- [cpp-type-override](type-override.md) - marking the overrides themselves
