---
id: cpp-type-string-view
lang: cpp
prefix: type
title: Take read-only string parameters as std::string_view, not const std::string&
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [string_view, string, parameter, allocation]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::string_view, std::string]
related: [cpp-type-span, cpp-type-parse-at-boundary]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::basic_string_view
    url: https://en.cppreference.com/w/cpp/string/basic_string_view
---
> Read strings through std::string_view so literals and substrings need no allocation.

## Why

`const std::string&` forces every caller that has a literal, a `char*`, or a substring to construct a `std::string` first, which allocates and copies for a function that only reads. `std::string_view` is a non-owning pointer-length pair that binds to all of those forms directly. It stays valid only while the source lives, so the function must use it within the call and never store it beyond the caller's guarantee.

## Bad

```cpp
#include <string>

// Bad: a string literal allocates a temporary std::string here.
bool starts_with_http(const std::string& url) {
    return url.rfind("http", 0) == 0;
}

int main() {
    return starts_with_http("https://example.com") ? 0 : 1;
}
```

## Good

```cpp
#include <string_view>

bool starts_with_http(std::string_view url) {
    return url.starts_with("http"); // no allocation, no copy
}

int main() {
    return starts_with_http("https://example.com") ? 0 : 1;
}
```

## See Also

- [cpp-type-span](type-span.md) - the same pattern for object sequences
- [cpp-type-parse-at-boundary](type-parse-at-boundary.md) - converting viewed text into owned types
