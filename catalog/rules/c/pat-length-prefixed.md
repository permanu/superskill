---
id: c-pat-length-prefixed
lang: c
prefix: pat
title: Carry untrusted strings as a pointer plus length
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [span, length, string, untrusted, bounds]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-ptr-string-termination, c-ptr-count-explicit]
sources:
  - title: SEI CERT C - STR32-C, do not pass a non-null-terminated character sequence to a library function that expects a string
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/characters-and-strings-str/str32-c/
---
> Represent byte ranges that come from input as data plus length and compare with bounded operations.

## Why

CERT's string rule exists because a sequence without a terminator causes scans to run past the object. Data that arrives with its own length should keep that length through the API instead of being forced into a terminated string that may not exist. A span struct makes the bound part of the value and lets every consumer use length-aware functions.

## Bad

```c
#include <string.h>

int name_matches(const char *name, const char *expected) {
    return strcmp(name, expected) == 0;   /* assumes both are terminated */
}
```

## Good

```c
#include <stddef.h>
#include <string.h>

struct span {
    const char *data;
    size_t len;
};

int span_matches(struct span s, const char *expected) {
    size_t n = strlen(expected);
    return s.len == n && memcmp(s.data, expected, n) == 0;   /* bounded compare */
}
```

## See Also

- [c-ptr-string-termination](ptr-string-termination.md) - the terminated-string case
- [c-ptr-count-explicit](ptr-count-explicit.md) - the same discipline for arrays
