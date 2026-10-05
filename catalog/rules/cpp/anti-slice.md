---
id: cpp-anti-slice
lang: cpp
prefix: anti
title: Do not pass polymorphic objects by value
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [slicing, inheritance, value-parameters]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-api-virtual-dtor, cpp-type-regular-value-types]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - virtual function specifier
    url: https://en.cppreference.com/w/cpp/language/virtual
---
> A by-value base parameter copies only the base subobject; the derived part is gone.

## Why

ES.63 is "Don't slice". The virtual reference explains the dispatch that slicing defeats: when a derived class is handled using pointer or reference to the base class, a call to an overridden virtual function invokes the derived behavior. Passing by value constructs a Base object from the argument, copying only the base subobject — the object the callee then calls through is a genuine Base, so the override is unreachable and any derived state is discarded. Polymorphic interfaces take references or pointers.

## Bad

```cpp
#include <string>

struct Base {
    virtual std::string name() const { return "base"; }
    virtual ~Base() = default;
};

struct Derived : Base {
    std::string name() const override { return "derived"; }
};

std::string describe(Base value) { // copies only the Base subobject
    return value.name();
}

int main() {
    Derived derived;
    return describe(derived) == "derived" ? 0 : 1; // gets "base"
}
```

## Good

```cpp
#include <string>

struct Base {
    virtual std::string name() const { return "base"; }
    virtual ~Base() = default;
};

struct Derived : Base {
    std::string name() const override { return "derived"; }
};

std::string describe(const Base& value) { // no copy, dispatch preserved
    return value.name();
}

int main() {
    Derived derived;
    return describe(derived) == "derived" ? 0 : 1;
}
```

## See Also

- [cpp-api-virtual-dtor](api-virtual-dtor.md) - the other half of polymorphic interfaces
- [cpp-type-regular-value-types](type-regular-value-types.md) - value types versus hierarchies
