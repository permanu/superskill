---
id: cpp-doc-file
lang: cpp
prefix: doc
title: Give each header a file-level @file block
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, file, header, doxygen]
  files: ["**/*.hpp", "**/*.h"]
  symbols: []
related: [cpp-doc-public-api, cpp-doc-group]
sources:
  - title: Doxygen manual - Documenting the code
    url: https://www.doxygen.nl/manual/docblocks.html
  - title: Doxygen manual - Special commands
    url: https://www.doxygen.nl/manual/commands.html
---
> Global entities are documented through their file; without a @file block they stay out of the reference.

## Why

Doxygen requires a file to be documented before the global objects it defines appear in the output: the manual states there must at least be a `/** @file */` line in the file, and the `\file` command notes that documentation of global functions, variables, typedefs, and enums is included only when the file is documented as well. The file block is also the natural place for the header's one-line purpose, which readers see before any declaration.

## Bad

```cpp
#include <cstddef>
#include <cstdint>

std::uint32_t crc32(const std::uint8_t* data, std::size_t size);

int main() {
    return 0;
}
```

## Good

```cpp
/** @file checksum.hpp
 *  @brief Checksum primitives shared by the wire protocol code.
 */
#include <cstddef>
#include <cstdint>

std::uint32_t crc32(const std::uint8_t* data, std::size_t size);

int main() {
    return 0;
}
```

## See Also

- [cpp-doc-public-api](doc-public-api.md) - the declarations this block makes visible
- [cpp-doc-group](doc-group.md) - the other structural block that organizes docs
