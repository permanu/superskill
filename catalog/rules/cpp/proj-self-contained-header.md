---
id: cpp-proj-self-contained-header
lang: cpp
prefix: proj
title: Header files should be self-contained
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [headers, includes, self-contained]
  files: ["**/*.hpp", "**/*.h"]
  symbols: []
related: [cpp-proj-include-what-you-use, cpp-macro-include-guard]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Source file inclusion
    url: https://en.cppreference.com/w/cpp/preprocessor/include
---
> A header that compiles only after its includer's includes is a trap.

## Why

SF.11 asks that header files be self-contained: each one includes everything it uses. The include reference shows how translation units are processed — a file is included by textual replacement and processed recursively — so a header that relies on an earlier include in the including file compiles in exactly the order someone happened to write, and breaks the moment another translation unit includes it first. The check is mechanical: include the header alone and compile it.

## Bad

```cpp
// widget.cpp
#include <string> // the .cpp supplies what the header forgot

// widget.hpp (shown inline)
std::string widget_name(); // compiles only because <string> came first

int main() {
    return widget_name().empty() ? 0 : 1;
}
```

## Good

```cpp
// widget.hpp
#include <string> // the header includes what it uses

std::string widget_name(); // compiles on its own

int main() {
    return widget_name().empty() ? 0 : 1;
}
```

## See Also

- [cpp-proj-include-what-you-use](proj-include-what-you-use.md) - the same discipline for includers
- [cpp-macro-include-guard](macro-include-guard.md) - the other header-level guard
