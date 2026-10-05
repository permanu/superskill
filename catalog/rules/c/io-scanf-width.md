---
id: c-io-scanf-width
lang: c
prefix: io
title: Bound %s and %[ conversions with a field width
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [scanf, field width, buffer overflow, format]
  files: ["**/*.c", "**/*.h"]
  symbols: [scanf, fscanf, sscanf]
related: [c-io-format-string-literal, c-ptr-string-termination]
sources:
  - title: cppreference - scanf, fscanf, sscanf
    url: https://en.cppreference.com/w/c/io/fscanf
---
> Give every unbounded string conversion an explicit width one less than the destination size.

## Why

The `%s` and `%[` conversions have no built-in limit: they read as many characters as the input offers and append a terminator, so a long token writes past the destination. The width field is the only bound the scanf family accepts, and it must leave room for the terminator. Deriving the width from the buffer size keeps the two in sync.

## Bad

```c
#include <stdio.h>

int read_word(FILE *f, char *out) {
    return fscanf(f, "%s", out);   /* unbounded: overflows out */
}
```

## Good

```c
#include <stdio.h>

int read_word(FILE *f, char out[32]) {
    return fscanf(f, "%31s", out);   /* 31 characters plus the terminator */
}
```

## See Also

- [c-io-format-string-literal](io-format-string-literal.md) - keeping the format itself under control
- [c-ptr-string-termination](ptr-string-termination.md) - why the terminator needs reserved space
