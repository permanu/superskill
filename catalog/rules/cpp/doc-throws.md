---
id: cpp-doc-throws
lang: cpp
prefix: doc
title: Document the exceptions a function may propagate
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, throws, exceptions, doxygen]
  files: ["**/*.hpp", "**/*.h"]
  symbols: []
related: [cpp-doc-params, cpp-err-catch-by-reference]
sources:
  - title: Doxygen manual - Special commands
    url: https://www.doxygen.nl/manual/commands.html
  - title: cppreference - std::exception
    url: https://en.cppreference.com/w/cpp/error/exception
---
> A caller can only handle what the documentation names; list each exception with @throws.

## Why

Doxygen's command set includes `@throw`, `@throws`, and `@exception` for exactly this purpose: naming the exception types a function can propagate and the conditions that trigger them. Without the entries, callers either wrap everything defensively or miss the one type they should handle, and the failure mode surfaces as a crash far from the cause. The doc block is the contract; the exception list is part of it.

## Bad

```cpp
#include <string>

/**
 * @brief Parse a port number from text.
 * @param text The field to parse.
 * @return The port.
 */
int parse_port(const std::string& text);

int main() {
    return 0;
}
```

## Good

```cpp
#include <stdexcept>
#include <string>

/**
 * @brief Parse a port number from text.
 * @param text The field to parse.
 * @return The port.
 * @throws std::invalid_argument if text is not a number in range.
 */
int parse_port(const std::string& text);

int main() {
    return 0;
}
```

## See Also

- [cpp-doc-params](doc-params.md) - the parameter and return entries
- [cpp-err-catch-by-reference](err-catch-by-reference.md) - catching the documented type
