---
id: cpp-api-param-passing
lang: cpp
prefix: api
title: Pass cheap-to-copy inputs by value and other read-only inputs by const reference or view
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [parameter, pass-by-value, const-ref, view]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::string_view]
related: [cpp-type-string-view, cpp-type-span, cpp-raii-param-ownership]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Match the parameter form to the cost: by value for cheap scalars, by const reference or view for the rest.

## Why

`const T&` adds indirection and blocks the compiler from knowing the value does not alias, which is pointless for an `int` or a pointer; passing those by value is cheaper and simpler. Large objects must not be copied per call, so they are passed by `const&` or, for read-only sequences, by `std::string_view`/`std::span`, which also accepts literals and subranges without allocating.

## Bad

```cpp
#include <string>

// Bad: reference indirection for an int; a literal allocates a temporary string.
int checksum(const int& seed, const std::string& name);

int main() {
    return checksum(1, "order-42");
}
```

## Good

```cpp
#include <string_view>

// Scalars by value; read-only text as a view, no allocation.
int checksum(int seed, std::string_view name);

int main() {
    return checksum(1, "order-42");
}
```

## See Also

- [cpp-type-string-view](type-string-view.md) - the string case in depth
- [cpp-type-span](type-span.md) - the sequence case in depth
- [cpp-raii-param-ownership](raii-param-ownership.md) - parameters that transfer ownership
