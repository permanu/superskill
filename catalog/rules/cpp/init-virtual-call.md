---
id: cpp-init-virtual-call
lang: cpp
prefix: init
title: Do not call virtual functions during construction
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [virtual-call, construction, destructors]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [virtual]
related: [cpp-init-defaulted-ctor, cpp-api-virtual-dtor]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - virtual function specifier
    url: https://en.cppreference.com/w/cpp/language/virtual
---
> During construction the more-derived classes do not exist; the call cannot reach them.

## Why

C.82 says not to call virtual functions in constructors and destructors. The virtual reference states the rule and the reason: when a virtual function is called directly or indirectly from a constructor or destructor and the object is the one under construction or destruction, the function called is the final overrider in that class — not one overriding it in a more-derived class — because during construction or destruction the more-derived classes do not exist. A base constructor that calls a virtual hoping for derived behavior gets its own version, silently. Data the base needs is passed in, not fetched through dispatch.

## Bad

```cpp
#include <string>

struct Base {
    Base() { (void)name(); } // calls Base::name, never the override
    virtual std::string name() const { return "base"; }
    virtual ~Base() = default;
};

struct Derived : Base {
    std::string name() const override { return "derived"; }
};

int main() {
    Derived derived;
    return 0;
}
```

## Good

```cpp
#include <string>
#include <utility>

struct Base {
    explicit Base(std::string value) : name_(std::move(value)) {} // data passed in
    const std::string& name() const { return name_; }
private:
    std::string name_;
};

struct Derived : Base {
    Derived() : Base("derived") {}
};

int main() {
    Derived derived;
    return derived.name() == "derived" ? 0 : 1;
}
```

## See Also

- [cpp-init-defaulted-ctor](init-defaulted-ctor.md) - constructors the compiler can write
- [cpp-api-virtual-dtor](api-virtual-dtor.md) - the virtual that must exist on the base
