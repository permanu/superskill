---
id: c-unsafe-char-signedness
lang: c
prefix: unsafe
title: Use unsigned char when a char value must be read as a byte
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [char, signedness, unsigned char, byte value]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-unsafe-ctype-domain, c-ptr-byte-access]
sources:
  - title: SEI CERT C - STR00-C, represent characters using an appropriate type
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/characters-and-strings-str/str00-c/
---
> Name the signedness explicitly when the numeric value of a character matters.

## Why

Plain `char` has implementation-defined signedness: on signed-char targets a byte of 0xFF is stored as -1 and comparisons and widening produce a negative value. Code that treats `char` as an unsigned byte works on one platform and fails on another, typically in parsers and checksum routines. `unsigned char` is the type whose values are the bytes.

## Bad

```c
int byte_value(char c) {
    return c;   /* sign-extends bytes >= 0x80 to negative values */
}
```

## Good

```c
int byte_value(char c) {
    return (int)(unsigned char)c;   /* the byte's value, 0..255 */
}
```

## See Also

- [c-unsafe-ctype-domain](unsafe-ctype-domain.md) - the same signedness hazard at ctype calls
- [c-ptr-byte-access](ptr-byte-access.md) - the byte view of whole objects
