---
id: c-doc-doxygen-brief
lang: c
prefix: doc
title: Open each documented entity with a one-line brief description
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [doxygen, brief, doc comment, API]
  files: ["**/*.h"]
  symbols: []
related: [c-doc-doxygen-params, c-doc-contract]
sources:
  - title: Doxygen - Documenting the code
    url: https://www.doxygen.nl/manual/docblocks.html
---
> Start every doc block with a one-sentence `@brief` that says what the entity is for.

## Why

The brief is what appears in indexes, tooltips, and auto-completion, so it is the only description many readers ever see; a long unstructured comment produces no usable summary. Doxygen's block syntax also separates the brief from the detailed text, so generated documentation can link and group the entity. One sentence first, details after.

## Bad

```c
#include <stddef.h>

/* Handles the buffer, checks the tag, validates the length, and returns the frame size. */
int decode(const unsigned char *buf, size_t len);
```

## Good

```c
#include <stddef.h>

/** @brief Decodes one frame from buf.
 *  @return frame length on success, -1 on malformed input.
 */
int decode(const unsigned char *buf, size_t len);
```

## See Also

- [c-doc-doxygen-params](doc-doxygen-params.md) - documenting each parameter and result
- [c-doc-contract](doc-contract.md) - the contract content behind the brief
