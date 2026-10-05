---
id: cpp-init-init-not-assign
lang: cpp
prefix: init
title: Initialize members instead of assigning in the constructor body
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [member-initializer-list, assignment, constructors]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-init-nsdmi, cpp-init-member-order]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Constructors and member initializer lists
    url: https://en.cppreference.com/w/cpp/language/constructor
---
> Assignment runs after construction; members that cannot be assigned need the list.

## Why

C.49 asks to prefer initialization to assignment in constructors. The constructor reference describes the split: before the body begins, initialization of all bases and members is finished, and the member initializer list is where non-default initialization is specified; members of reference and const-qualified types can only be initialized there. A member assigned in the body is first default-constructed and then overwritten — two operations where one would do, and an error for the members assignment cannot reach.

## Bad

```cpp
#include <string>

struct Widget {
    std::string name;
    Widget(const std::string& value) { name = value; } // default-construct then assign
};

int main() {
    Widget widget("a");
    return widget.name == "a" ? 0 : 1;
}
```

## Good

```cpp
#include <string>

struct Widget {
    std::string name;
    Widget(const std::string& value) : name(value) {} // constructed once
};

int main() {
    Widget widget("a");
    return widget.name == "a" ? 0 : 1;
}
```

## See Also

- [cpp-init-nsdmi](init-nsdmi.md) - constants that belong on the declaration
- [cpp-init-member-order](init-member-order.md) - the order the list actually runs in
