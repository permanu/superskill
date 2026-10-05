---
id: c-doc-file-purpose
lang: c
prefix: doc
title: Give every source file a header comment stating its purpose
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [file comment, module, purpose, doxygen]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-doc-doxygen-brief, c-doc-contract]
sources:
  - title: Doxygen - Documenting the code
    url: https://www.doxygen.nl/manual/docblocks.html
---
> Open each file with a one-line statement of what the module provides and who consumes it.

## Why

A reader who lands in a file needs the orientation the file name cannot give: is this the parser or the formatter, is it public or internal, what is the one invariant it maintains. The file-level block also feeds generated documentation groups. One sentence at the top saves a scan of the whole file.

## Bad

```c
#include <stddef.h>

size_t frame_len(const unsigned char *p);
```

## Good

```c
/** @file frame.h
 *  @brief Frame length helpers for the wire protocol.
 */
#include <stddef.h>

size_t frame_len(const unsigned char *p);
```

## See Also

- [c-doc-doxygen-brief](doc-doxygen-brief.md) - the entity-level version of the same summary
- [c-doc-contract](doc-contract.md) - the per-function contract inside the file
