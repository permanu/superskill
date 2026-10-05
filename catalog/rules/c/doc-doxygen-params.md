---
id: c-doc-doxygen-params
lang: c
prefix: doc
title: Document each parameter and return value with structured commands
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [doxygen, param, return, API docs]
  files: ["**/*.h"]
  symbols: []
related: [c-doc-doxygen-brief, c-doc-param-names]
sources:
  - title: Doxygen - Documenting the code
    url: https://www.doxygen.nl/manual/docblocks.html
---
> Enumerate every parameter and the return value in the doc block so the generated reference is complete.

## Why

Prose that mentions some parameters leaves the rest to guesswork, and generated documentation can only link what is marked up. Structured commands tie each description to the exact parameter and make omissions obvious during review. When a parameter is added, the missing entry is visible in the diff.

## Bad

```c
/** @brief Writes a value. */
int write_value(int fd, int value);
```

## Good

```c
/** @brief Writes a value.
 *  @param fd    open descriptor to write to
 *  @param value value to encode
 *  @return 0 on success, -1 on write failure
 */
int write_value(int fd, int value);
```

## See Also

- [c-doc-doxygen-brief](doc-doxygen-brief.md) - the summary these details follow
- [c-doc-param-names](doc-param-names.md) - naming the parameters being documented
