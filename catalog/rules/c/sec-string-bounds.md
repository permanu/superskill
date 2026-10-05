---
id: c-sec-string-bounds
lang: c
prefix: sec
title: Size string storage for the data plus the terminator
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [string, terminator, buffer size, overflow]
  files: ["**/*.c", "**/*.h"]
  symbols: [strlen, memcpy]
related: [c-ptr-string-termination, c-unsafe-copy-bounds]
sources:
  - title: SEI CERT C - STR31-C, guarantee that storage for strings has sufficient space for character data and the null terminator
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/characters-and-strings-str/str31-c/
---
> Count the terminator when checking capacity, and reject copies that do not fit.

## Why

Every null-terminated string needs one more byte than its `strlen`, and loops and length checks that forget it write one byte past the destination. The off-by-one is the classic string overflow. Compute the required size as length plus one and compare it with the destination capacity before copying.

## Bad

```c
#include <string.h>

void store_tag(char *dst, const char *tag) {
    strcpy(dst, tag);   /* destination size never checked */
}
```

## Good

```c
#include <string.h>

int store_tag(char *dst, size_t cap, const char *tag) {
    size_t n = strlen(tag) + 1;   /* count the terminator */
    if (n > cap) {
        return -1;
    }
    memcpy(dst, tag, n);
    return 0;
}
```

## See Also

- [c-ptr-string-termination](ptr-string-termination.md) - passing only terminated sequences
- [c-unsafe-copy-bounds](unsafe-copy-bounds.md) - bounding the copy itself
