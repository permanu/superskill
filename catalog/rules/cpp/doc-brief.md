---
id: cpp-doc-brief
lang: cpp
prefix: doc
title: Lead each doc block with a one-line brief description
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, brief, doxygen, summary]
  files: ["**/*.hpp", "**/*.h"]
  symbols: []
related: [cpp-doc-public-api, cpp-doc-params]
sources:
  - title: Doxygen manual - Documenting the code
    url: https://www.doxygen.nl/manual/docblocks.html
---
> The brief line is what readers scan and what tooltips show; details follow it.

## Why

Each documented entity has a brief description and a detailed description: the brief is a short one-liner, while the detailed part carries the longer explanation. Doxygen uses the brief in member overviews and tooltips, so a block that starts with a paragraph of detail hides the summary exactly where readers look first. Leading with `@brief` and separating the details with a blank line gives both levels their place.

## Bad

```cpp
#include <cstddef>
#include <cstdint>

// Checksum details: the function iterates over the buffer and mixes bytes;
// it is intended for integrity checks of small control packets.
std::uint32_t checksum(const std::uint8_t* data, std::size_t size);

int main() {
    return 0;
}
```

## Good

```cpp
#include <cstddef>
#include <cstdint>

/**
 * @brief Compute a checksum for small control packets.
 *
 * Iterates over the buffer and mixes every byte.
 */
std::uint32_t checksum(const std::uint8_t* data, std::size_t size);

int main() {
    return 0;
}
```

## See Also

- [cpp-doc-public-api](doc-public-api.md) - the coverage rule this structure serves
- [cpp-doc-params](doc-params.md) - the per-parameter entries below the brief
