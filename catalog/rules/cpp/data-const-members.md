---
id: cpp-data-const-members
lang: cpp
prefix: data
title: Avoid const data members in assignable types
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [const-members, assignment, invariants]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-const-immutable-by-default, cpp-data-two-phase]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Copy assignment operator
    url: https://en.cppreference.com/w/cpp/language/copy_assignment
---
> A const data member deletes the assignment operator the type would otherwise have.

## Why

C.12 asks not to make data members const or references in a copyable or movable type. The copy assignment reference lists the consequence: an implicitly-declared or defaulted copy assignment operator is defined as deleted if the class has a non-static data member of const-qualified non-class type or of reference type. A const member therefore turns a value type into one that cannot be assigned — discovered when a container or algorithm requires it. If the value never changes, the whole object can be const; the member stays mutable in the type.

## Bad

```cpp
#include <string>
#include <utility>

struct Widget {
    const int id; // const member: the implicit copy assignment is deleted
    std::string name;
    Widget(int value, std::string text) : id(value), name(std::move(text)) {}
    // first = second would not compile
};

int main() {
    Widget widget(1, "a");
    return widget.id == 1 ? 0 : 1;
}
```

## Good

```cpp
#include <string>
#include <utility>

struct Widget {
    int id; // assignable
    std::string name;
    Widget(int value, std::string text) : id(value), name(std::move(text)) {}
};

int main() {
    Widget first(1, "a");
    Widget second(2, "b");
    first = second; // assignment works
    return first.id == 2 ? 0 : 1;
}
```

## See Also

- [cpp-const-immutable-by-default](const-immutable-by-default.md) - const objects, mutable members
- [cpp-data-two-phase](data-two-phase.md) - constructing objects that are complete
