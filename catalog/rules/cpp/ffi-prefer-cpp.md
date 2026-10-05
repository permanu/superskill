---
id: cpp-ffi-prefer-cpp
lang: cpp
prefix: ffi
title: Prefer C++ facilities; compile the C subset as C++
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [c-style, prefer-cpp, subset, interop]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-ffi-cpp-calling-c, cpp-sec-safe-string-functions]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Language linkage
    url: https://en.cppreference.com/w/cpp/language/language_linkage
---
> C++ code uses C++ facilities; when C is required, the common subset is compiled as C++.

## Why

CPL.1 is "Prefer C++ to C": the standard library's types and algorithms are type-safe, manage their resources, and compose, while the C equivalents push sizes, ownership, and error handling onto every call site. CPL.2 refines the exception: if you must use C, use the common subset of C and C++, and compile the C code as C++ — the subset is valid under both languages, and the C++ compiler type-checks it more thoroughly. The two rules together say that C++ translation units should not be written in C out of habit.

## Bad

```cpp
#include <cstring>

int main() {
    char buffer[16];
    std::strcpy(buffer, "widget"); // C-style buffer in a C++ program
    return std::strlen(buffer) == 6 ? 0 : 1;
}
```

## Good

```cpp
#include <string>

int main() {
    const std::string name = "widget"; // C++ facility
    return name.size() == 6 ? 0 : 1;
}
```

## See Also

- [cpp-ffi-cpp-calling-c](ffi-cpp-calling-c.md) - wrapping the C that remains
- [cpp-sec-safe-string-functions](sec-safe-string-functions.md) - why the buffer form is unsafe
