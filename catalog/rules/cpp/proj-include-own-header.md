---
id: cpp-proj-include-own-header
lang: cpp
prefix: proj
title: Include the file's own header first
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [include-order, headers, self-containment]
  files: ["**/*.cpp"]
  symbols: []
related: [cpp-proj-self-contained-header, cpp-proj-include-what-you-use]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Source file inclusion
    url: https://en.cppreference.com/w/cpp/preprocessor/include
---
> Putting the header first makes every .cpp a self-containment test.

## Why

SF.5 asks that a .cpp file include the header that defines its interface. The include reference shows why the position matters: inclusion is textual replacement processed in order, so any include placed before the header can supply names the header forgot, and the header's missing dependencies stay hidden until some other file includes it first. With the own header first, the translation unit fails immediately when the header is not self-contained, and the failure points at the header.

## Bad

```cpp
// widget.cpp
#include <string> // other headers first

// widget.hpp (shown inline) is included last, after the others
std::string widget_name(); // its missing includes stay hidden

int main() {
    return widget_name().empty() ? 0 : 1;
}
```

## Good

```cpp
// widget.cpp
// widget.hpp (shown inline) is included first, before any other header
#include <string> // so it must carry this include itself

std::string widget_name();

int main() {
    return widget_name().empty() ? 0 : 1;
}
```

## See Also

- [cpp-proj-self-contained-header](proj-self-contained-header.md) - the property this order verifies
- [cpp-proj-include-what-you-use](proj-include-what-you-use.md) - the same discipline for the rest
