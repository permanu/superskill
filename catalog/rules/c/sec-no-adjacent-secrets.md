---
id: c-sec-no-adjacent-secrets
lang: c
prefix: sec
title: Keep sensitive fields away from buffers that can overflow
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [buffer overflow, secrets, struct layout, adjacent]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-sec-string-bounds, c-ptr-byte-access]
sources:
  - title: SEI CERT C - API01-C, avoid laying out strings in memory directly before sensitive data
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/application-programming-interfaces-api/api01-c/
---
> Place pointers and secrets before strings in a structure, and bound string reads.

## Why

Strings are the field most likely to overflow, and whatever sits immediately after them is what an overflow overwrites. If that is a function pointer, a length, or a key, the corruption turns into control-flow hijack or key disclosure. Ordering sensitive fields before strings and reading strings with a bound reduces both the reach and the consequence of an overflow.

## Bad

```c
#include <string.h>

struct account {
    char user[16];
    unsigned char token[16];   /* secret directly after the string */
};

size_t user_len(const struct account *a) {
    return strlen(a->user);   /* overreads into token when unterminated */
}
```

## Good

```c
#include <string.h>

struct account {
    unsigned char token[16];   /* secrets first */
    char user[16];             /* strings last */
};

size_t user_len(const struct account *a) {
    const char *end = memchr(a->user, '\0', sizeof a->user);
    return end != NULL ? (size_t)(end - a->user) : sizeof a->user;
}
```

## See Also

- [c-sec-string-bounds](sec-string-bounds.md) - sizing the string storage itself
- [c-ptr-byte-access](ptr-byte-access.md) - reading object bytes without overreach
