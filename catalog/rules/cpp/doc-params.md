---
id: cpp-doc-params
lang: cpp
prefix: doc
title: Document every parameter and return value in the doc block
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, param, return, doxygen]
  files: ["**/*.hpp", "**/*.h"]
  symbols: []
related: [cpp-doc-brief, cpp-doc-throws]
sources:
  - title: Doxygen manual - Special commands
    url: https://www.doxygen.nl/manual/commands.html
  - title: Doxygen manual - Documenting the code
    url: https://www.doxygen.nl/manual/docblocks.html
---
> Give each parameter a @param entry and each result a @return; the names alone do not state the contract.

## Why

`@param` takes the parameter name and its description, and `[in]`, `[out]`, and `[in,out]` record the direction, so a caller can see what the function reads and what it writes without opening the implementation. A parameter with no entry is exactly the one callers must guess about, and a returned value with no `@return` leaves the success meaning undefined. The entries live in the same block as the brief, where the reader already is.

## Bad

```cpp
#include <cstddef>

/**
 * @brief Copy bytes from source to destination.
 * @param destination Where the bytes are written.
 */
void copy_bytes(char* destination, const char* source, std::size_t size);

int main() {
    return 0;
}
```

## Good

```cpp
#include <cstddef>

/**
 * @brief Copy bytes from source to destination.
 * @param destination Where the bytes are written.
 * @param source Where the bytes are read from.
 * @param size Number of bytes to copy.
 */
void copy_bytes(char* destination, const char* source, std::size_t size);

int main() {
    return 0;
}
```

## See Also

- [cpp-doc-brief](doc-brief.md) - the summary above the parameter entries
- [cpp-doc-throws](doc-throws.md) - documenting the failures alongside them
