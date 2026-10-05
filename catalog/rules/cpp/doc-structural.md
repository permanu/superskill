---
id: cpp-doc-structural
lang: cpp
prefix: doc
title: Put the doc block in front of the declaration, not behind a structural command
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, fn, class, structural, doxygen]
  files: ["**/*.hpp", "**/*.h"]
  symbols: []
related: [cpp-doc-file, cpp-doc-params]
sources:
  - title: Doxygen manual - Documenting the code
    url: https://www.doxygen.nl/manual/docblocks.html
---
> Structural commands duplicate the declaration and drift; place the block where the entity is.

## Why

Doxygen accepts `\fn`, `\class`, and the other structural commands so a block can live away from what it documents, but the manual warns that the price is duplication of information and that structural commands should be avoided unless other requirements force their use. The `\fn` command itself is documented as one to omit when the comment block already sits in front of the declaration, because the prototype would otherwise be written twice and must be kept in sync by hand. A block in front of the declaration is checked by proximity, not by discipline.

## Bad

```cpp
#include <string>

/*! \fn int word_count(const std::string& text)
 *  \brief Count whitespace-separated words.
 *  \param text The text to scan.
 */
int word_count(const std::string& text);

int main() {
    return 0;
}
```

## Good

```cpp
#include <string>

/** @brief Count whitespace-separated words.
 *  @param text The text to scan.
 */
int word_count(const std::string& text);

int main() {
    return 0;
}
```

## See Also

- [cpp-doc-file](doc-file.md) - the one place a structural command is required
- [cpp-doc-params](doc-params.md) - the parameter entries that live in this block
