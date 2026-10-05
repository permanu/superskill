---
id: cpp-ffi-pointer-and-size
lang: cpp
prefix: ffi
title: Pass sequences across the boundary as pointer and length
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pointer, length, c-api, sequences]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: []
related: [cpp-ffi-prefer-cpp, cpp-type-span]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::span
    url: https://en.cppreference.com/w/cpp/container/span
---
> A C signature can spell a pointer and a length; it cannot spell a container.

## Why

CPL.3 keeps the calling code in C++ while the interface stays C, and the only sequence representation C can express is a pointer plus a length. A `std::string` or `std::vector` parameter in an `extern "C"` declaration compiles, but no C caller can construct one, and its layout is not part of any C declaration — the boundary would be unusable from the other side. The C++ side can present the same pair as `std::span`, which carries exactly a pointer and a size, so one signature serves both languages.

## Bad

```cpp
#include <string>

extern "C" void widget_write(std::string text); // C++ type in a C interface

int main() {
    return 0;
}
```

## Good

```cpp
#include <cstddef>

extern "C" void widget_write(const char* data, std::size_t size); // pointer and length

int main() {
    return 0;
}
```

## See Also

- [cpp-ffi-prefer-cpp](ffi-prefer-cpp.md) - where the C++ conveniences belong instead
- [cpp-type-span](type-span.md) - the C++ view over the same pair
