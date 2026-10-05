---
id: cpp-str-cstr-boundary
lang: cpp
prefix: str
title: Convert to c_str only at the C boundary, never store the pointer
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [c_str, c-api, pointer, lifetime]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [c_str]
related: [cpp-str-view-invalidation, cpp-raii-raw-non-owning]
sources:
  - title: cppreference - std::string
    url: https://en.cppreference.com/w/cpp/string/basic_string
  - title: cppreference - std::basic_string_view
    url: https://en.cppreference.com/w/cpp/string/basic_string_view
---
> c_str returns a pointer into the string; it dies with the string or its next change.

## Why

`c_str()` hands out a pointer to the string's own storage so a C API can read it. The pointer is governed by the string's invalidation rules: destroying the string or running any non-const operation that reallocates leaves it dangling, and returning it from the function that owns the string is the classic version of the bug. The pointer is valid exactly as a call argument, for the duration of the call, while the string is alive.

## Bad

```cpp
#include <cstdio>
#include <string>

const char* label() {
    const std::string name = "service";
    return name.c_str(); // dangling when the function returns
}

int main() {
    std::printf("%s\n", label());
    return 0;
}
```

## Good

```cpp
#include <cstdio>
#include <string>

void print_label() {
    const std::string name = "service";
    std::printf("%s\n", name.c_str()); // used within the string's lifetime
}

int main() {
    print_label();
    return 0;
}
```

## See Also

- [cpp-str-view-invalidation](str-view-invalidation.md) - the same invalidation rule for views
- [cpp-raii-raw-non-owning](raii-raw-non-owning.md) - pointers that never own their target
