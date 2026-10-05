---
id: cpp-raii-no-naked-new
lang: cpp
prefix: raii
title: Do not call new or delete explicitly; create owners with make_unique or make_shared
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [new, delete, make_unique, allocation]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [new, delete, std::make_unique]
related: [cpp-raii-make-unique, cpp-raii-raw-non-owning]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::unique_ptr
    url: https://en.cppreference.com/w/cpp/memory/unique_ptr
---
> Never pair new and delete by hand; every allocation is owned by a smart pointer or container.

## Why

A naked `new` returns a raw pointer whose ownership is invisible, and every subsequent exit path must delete it. Containers and smart pointers acquire in the constructor and release in the destructor, so early returns and exceptions cannot leak. Explicit `delete` is the mirror image: it marks code that RAII should have replaced.

## Bad

```cpp
#include <string>

std::string* make_greeting(const std::string& name) {
    return new std::string("hello " + name); // caller must delete
}

int main() {
    std::string* greeting = make_greeting("world");
    // an early return or exception here leaks *greeting
    delete greeting;
}
```

## Good

```cpp
#include <memory>
#include <string>

std::unique_ptr<std::string> make_greeting(const std::string& name) {
    return std::make_unique<std::string>("hello " + name);
}

int main() {
    auto greeting = make_greeting("world");
} // freed here
```

## See Also

- [cpp-raii-make-unique](raii-make-unique.md) - the creation functions that replace new
- [cpp-raii-raw-non-owning](raii-raw-non-owning.md) - why the returned pointer was the problem
