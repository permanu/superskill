---
id: cpp-api-virtual-dtor
lang: cpp
prefix: api
title: A base class destructor is public and virtual, or protected and non-virtual
severity: must
enforce: both
tool: clang:-Wdelete-non-virtual-dtor
baseline: latest
status: verified
triggers:
  keywords: [destructor, virtual, base-class, delete]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [virtual, ~T]
related: [cpp-api-abstract-interface, cpp-type-override]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Make a deletable base destructor public and virtual; make a non-deletable base destructor protected and non-virtual.

## Why

Deleting a derived object through a base pointer with a non-virtual destructor is undefined behavior: only the base subobject is destroyed, so the derived part leaks or corrupts. A public virtual destructor makes `delete` through the base well-defined; a protected non-virtual destructor prevents deletion through the base at compile time while still allowing derived destructors to run. Public non-virtual is the one combination that is always wrong for a polymorphic base.

## Bad

```cpp
#include <memory>

struct Base {
    ~Base() = default; // non-virtual: delete through Base* is undefined
    virtual void run() = 0;
};

struct Derived : Base {
    void run() override {}
    ~Derived() { /* releases a resource */ }
};

int main() {
    std::unique_ptr<Base> base = std::make_unique<Derived>();
} // Derived::~Derived never runs
```

## Good

```cpp
#include <memory>

struct Base {
    virtual ~Base() = default; // public and virtual
    virtual void run() = 0;
};

struct Derived : Base {
    void run() override {}
    ~Derived() override { /* releases a resource */ }
};

int main() {
    std::unique_ptr<Base> base = std::make_unique<Derived>();
} // Derived::~Derived runs
```

## See Also

- [cpp-api-abstract-interface](api-abstract-interface.md) - interfaces end with this destructor
- [cpp-type-override](type-override.md) - destructors are overrides too
