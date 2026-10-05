---
id: cpp-str-own-with-string
lang: cpp
prefix: str
title: Own character sequences with std::string, not hand-managed buffers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [string, ownership, buffer, chars]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::string]
related: [cpp-str-view-lifetime, cpp-sec-safe-string-functions]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::string
    url: https://en.cppreference.com/w/cpp/string/basic_string
---
> std::string owns, sizes, and grows its storage; a char array does none of that.

## Why

SL.str.1 asks for `std::string` to own character sequences: it stores the characters contiguously, tracks the length, grows on demand, and frees the storage when it dies. A hand-managed array fixes a capacity at the declaration and leaves the length to be passed separately, so every operation must agree on both and none of them enforce it. The owning string makes the size and the lifetime properties of the value rather than conventions around it.

## Bad

```cpp
#include <cstring>

int main() {
    char name[16] = "service";
    char copy[16];
    std::strcpy(copy, name); // manual buffer management
    return copy[0] == 's' ? 0 : 1;
}
```

## Good

```cpp
#include <string>

int main() {
    const std::string name = "service";
    const std::string copy = name; // owns and sizes itself
    return copy[0] == 's' ? 0 : 1;
}
```

## See Also

- [cpp-str-view-lifetime](str-view-lifetime.md) - the non-owning counterpart
- [cpp-sec-safe-string-functions](sec-safe-string-functions.md) - why the array form overflows
