---
id: cpp-init-delegating
lang: cpp
prefix: init
title: Share constructor work through delegation
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [delegating-constructor, constructors, duplication]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-init-init-not-assign, cpp-init-defaulted-ctor]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Constructors and member initializer lists
    url: https://en.cppreference.com/w/cpp/language/constructor
---
> A delegating constructor names another constructor as its target and runs it first.

## Why

C.51 asks to use delegating constructors to represent common actions for all constructors of a class. The constructor reference defines the form: when the class name itself appears in the member initializer list as the only element, the selected constructor is the target, it runs first, and then control returns to the delegating constructor's body. Repeating the same member list in several constructors multiplies the places a new member must be added; delegation keeps one constructor as the owner of the common work.

## Bad

```cpp
#include <string>

struct Widget {
    std::string name;
    int size;
    Widget() : name(""), size(0) {}
    Widget(const std::string& value) : name(value), size(0) {} // repeats the default
};

int main() {
    Widget widget("a");
    return widget.size == 0 ? 0 : 1;
}
```

## Good

```cpp
#include <string>

struct Widget {
    std::string name;
    int size;
    Widget() : Widget("") {} // delegates to the target constructor
    Widget(const std::string& value) : name(value), size(0) {}
};

int main() {
    Widget widget("a");
    return widget.size == 0 ? 0 : 1;
}
```

## See Also

- [cpp-init-init-not-assign](init-init-not-assign.md) - where the shared work belongs
- [cpp-init-defaulted-ctor](init-defaulted-ctor.md) - the constructor the compiler can write
