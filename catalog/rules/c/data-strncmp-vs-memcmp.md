---
id: c-data-strncmp-vs-memcmp
lang: c
prefix: data
title: Compare fixed-size binary keys with memcmp, not strncmp
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [strncmp, memcmp, fixed size, binary key]
  files: ["**/*.c", "**/*.h"]
  symbols: [strncmp, memcmp]
related: [c-ptr-string-termination, c-unsafe-padding-compare]
sources:
  - title: cppreference - strncmp
    url: https://en.cppreference.com/w/c/string/byte/strncmp
---
> `strncmp` stops at the first null byte; `memcmp` compares the full fixed-size range.

## Why

cppreference states that characters following a null character are not compared by `strncmp`, so two binary keys that share a prefix up to an embedded zero compare equal even when their later bytes differ. Fixed-size keys are byte strings, not text, and the whole range is meaningful. `memcmp` compares all of it.

## Bad

```c
#include <string.h>

struct key {
    char bytes[8];
};

int key_equal(const struct key *a, const struct key *b) {
    return strncmp(a->bytes, b->bytes, sizeof a->bytes) == 0;   /* stops at a NUL */
}
```

## Good

```c
#include <string.h>

struct key {
    char bytes[8];
};

int key_equal(const struct key *a, const struct key *b) {
    return memcmp(a->bytes, b->bytes, sizeof a->bytes) == 0;   /* full fixed-size key */
}
```

## See Also

- [c-ptr-string-termination](ptr-string-termination.md) - when a terminator is required instead
- [c-unsafe-padding-compare](unsafe-padding-compare.md) - the struct case to avoid
