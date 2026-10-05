---
id: cpp-err-catch-by-reference
lang: cpp
prefix: err
title: Catch exceptions by const reference so derived exceptions are not sliced
severity: must
enforce: both
tool: clang-tidy:misc-throw-by-value-catch-by-reference
baseline: latest
status: verified
triggers:
  keywords: [catch, reference, slicing, exception]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [catch]
related: [cpp-err-throw-by-value, cpp-err-catch-order]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: isocpp.org FAQ - Exceptions and Error Handling
    url: https://isocpp.org/wiki/faq/exceptions
---
> Catch exceptions by const reference; catching by value slices the dynamic type and copies.

## Why

The exception object has a dynamic type, but a by-value handler constructs a new object of the static handler type, discarding the derived part and any message or data it carries. A `const&` handler binds to the original object, preserves overrides of `what()` and virtual dispatch, and avoids a copy that can itself throw. Catch by value only for small scalar-like error types.

## Bad

```cpp
#include <iostream>
#include <stdexcept>

class ParseError : public std::runtime_error {
public:
    ParseError() : std::runtime_error("invalid input") {}
};

int main() {
    try {
        throw ParseError{};
    } catch (std::runtime_error e) { // slicing copy
        std::cout << e.what() << '\n';
    }
}
```

## Good

```cpp
#include <iostream>
#include <stdexcept>

class ParseError : public std::runtime_error {
public:
    ParseError() : std::runtime_error("invalid input") {}
};

int main() {
    try {
        throw ParseError{};
    } catch (const std::exception& e) { // binds to the original object
        std::cout << e.what() << '\n';
    }
}
```

## See Also

- [cpp-err-throw-by-value](err-throw-by-value.md) - throw the object, catch it by reference
- [cpp-err-catch-order](err-catch-order.md) - the other half of handler discipline
