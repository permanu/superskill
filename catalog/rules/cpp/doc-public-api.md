---
id: cpp-doc-public-api
lang: cpp
prefix: doc
title: Document every public declaration in the header
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, doxygen, public-api, headers]
  files: ["**/*.hpp", "**/*.h"]
  symbols: []
related: [cpp-doc-file, cpp-doc-brief]
sources:
  - title: Doxygen manual - Documenting the code
    url: https://www.doxygen.nl/manual/docblocks.html
---
> A special comment block before each public declaration is the API documentation.

## Why

Doxygen builds its reference from special comment blocks: a brief and a detailed description together form the documentation of an entity, and declarations without one simply do not appear in the generated reference. The header is the file users include and read, so a public function whose contract lives nowhere forces every caller to read the implementation or guess. The doc block sits directly in front of the declaration, where the tool picks it up and the reader finds it.

## Bad

```cpp
#include <string>

std::string normalize(const std::string& input); // behavior left to the reader

int main() {
    return 0;
}
```

## Good

```cpp
#include <string>

/**
 * @brief Collapse runs of whitespace in text to single spaces.
 *
 * The returned string never contains two adjacent spaces.
 */
std::string normalize(const std::string& input);

int main() {
    return 0;
}
```

## See Also

- [cpp-doc-file](doc-file.md) - the file-level block that public docs attach to
- [cpp-doc-brief](doc-brief.md) - the one-line summary at the top of the block
