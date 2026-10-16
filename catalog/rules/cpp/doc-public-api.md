---
id: cpp-doc-public-api
lang: cpp
prefix: doc
title: Document public contracts that declarations cannot convey
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
  - title: Google Engineering Practices - Comments and Documentation
    url: https://google.github.io/eng-practices/review/reviewer/looking-for.html
  - title: Doxygen manual - Documenting the code
    url: https://www.doxygen.nl/manual/docblocks.html
---
> Put non-obvious public contracts in tool-compatible documentation next to the declaration, without mandatory boilerplate on self-explanatory APIs.

## Why

Doxygen recognizes special comment blocks, but the project's documentation configuration determines what appears in the reference. A public header should expose semantics that types and names do not express, such as ownership, encoding or edge-case behavior. Preserve required documentation coverage while avoiding summaries that merely repeat declarations.

## Bad

```cpp
/** @file */
#include <string>

std::string normalize(const std::string& input);

int main() {
    return 0;
}
```

## Good

```cpp
/** @file */
#include <string>

/**
 * @brief Return a copy with runs of ASCII whitespace collapsed to single spaces.
 *
 * Whitespace is space, tab, newline, carriage return, form feed, or vertical tab.
 * Leading and trailing runs are preserved as one space, not trimmed.
 * All other bytes are unchanged; empty input returns an empty string.
 */
std::string normalize(const std::string& input);

int main() {
    return 0;
}
```

## See Also

- [cpp-doc-file](doc-file.md) - the file-level block that public docs attach to
- [cpp-doc-brief](doc-brief.md) - the one-line summary at the top of the block
