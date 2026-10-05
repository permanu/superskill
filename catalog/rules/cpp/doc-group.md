---
id: cpp-doc-group
lang: cpp
prefix: doc
title: Group related declarations with @defgroup and the group markers
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, grouping, defgroup, doxygen]
  files: ["**/*.hpp", "**/*.h"]
  symbols: []
related: [cpp-doc-file, cpp-doc-structural]
sources:
  - title: Doxygen manual - Grouping
    url: https://www.doxygen.nl/manual/grouping.html
  - title: Doxygen manual - Special commands
    url: https://www.doxygen.nl/manual/commands.html
---
> A topic page for a family of functions reads better than a flat alphabetical list.

## Why

Grouping collects entities onto a separate page called a topic, which can carry its own documentation; `@defgroup` defines the group and `@ingroup` or the `@{` ... `@}` markers place members inside it. The manual notes that groups can be nested, so a codec family can live under a protocol group, and members that belong together are documented together. Without grouping, readers find related functions only by name adjacency in the generated index.

## Bad

```cpp
/** @brief Encode one byte as two hexadecimal characters. */
void encode_byte(unsigned char value, char out[2]);

/** @brief Decode two hexadecimal characters into a byte. */
int decode_byte(const char in[2]);

int main() {
    return 0;
}
```

## Good

```cpp
/** @defgroup codec Byte encoding and decoding
 *  @{
 */

/** @brief Encode one byte as two hexadecimal characters. */
void encode_byte(unsigned char value, char out[2]);

/** @brief Decode two hexadecimal characters into a byte. */
int decode_byte(const char in[2]);

/** @} */

int main() {
    return 0;
}
```

## See Also

- [cpp-doc-file](doc-file.md) - the other block that organizes the reference
- [cpp-doc-structural](doc-structural.md) - keeping group comments next to their members
