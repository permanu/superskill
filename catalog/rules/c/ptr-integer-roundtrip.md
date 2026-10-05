---
id: c-ptr-integer-roundtrip
lang: c
prefix: ptr
title: Round-trip pointers only through intptr_t or uintptr_t, never a narrower integer
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [uintptr_t, intptr_t, integer conversion, truncation]
  files: ["**/*.c", "**/*.h"]
  symbols: [uintptr_t, intptr_t]
related: [c-ptr-null-check]
sources:
  - title: SEI CERT C - INT36-C, converting a pointer to integer or integer to pointer
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/integers-int/int36-c/
---
> Store pointer values in intptr_t or uintptr_t so the width matches the platform; never a fixed narrow integer.

## Why

Converting a pointer to an integer that cannot represent it is undefined behavior, and the classic failure is a 64-bit pointer stored in a 32-bit `unsigned int` and reconstructed truncated. `intptr_t` and `uintptr_t` are defined to survive the round trip for `void *`. Even there, the value is an opaque token: reconstructing a pointer that was never converted from one is not portable.

## Bad

```c
#include <stdint.h>

int pack(const void *p, uint32_t *out) {
    *out = (uint32_t)(uintptr_t)p;   /* truncates 64-bit pointers */
    return 0;
}
```

## Good

```c
#include <stdint.h>

int pack(const void *p, uintptr_t *out) {
    *out = (uintptr_t)p;             /* width matches the platform */
    return 0;
}

void *unpack(uintptr_t token) {
    return (void *)token;            /* same width: the value survives */
}
```

## See Also

- [c-ptr-null-check](ptr-null-check.md) - validating what comes back
