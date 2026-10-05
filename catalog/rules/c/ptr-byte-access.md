---
id: c-ptr-byte-access
lang: c
prefix: ptr
title: Read and write object bytes through unsigned char pointers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unsigned char, object representation, bytes, checksum]
  files: ["**/*.c", "**/*.h"]
  symbols: [unsigned char]
related: [c-ptr-strict-alias, c-ptr-const-params]
sources:
  - title: cppreference - Objects and alignment
    url: https://en.cppreference.com/w/c/language/object
---
> Use unsigned char for the byte view of an object; plain char can be signed and misrepresent the values.

## Why

Any object can be copied into or inspected as an array of character type, and that access is the defined way to look at object representation. `unsigned char` gives every byte its exact value from 0 to 255, while plain `char` may be signed and sign-extend 0xFF to a large negative value when widened. Checksums, serialization, and byte comparison all need the unsigned view.

## Bad

```c
#include <stddef.h>

unsigned checksum(const void *obj, size_t n) {
    const char *p = obj;          /* signed char sign-extends */
    unsigned sum = 0;
    for (size_t i = 0; i < n; ++i) {
        sum += (unsigned)p[i];    /* 0xFF becomes 0xFFFFFFFF */
    }
    return sum;
}
```

## Good

```c
#include <stddef.h>

unsigned checksum(const void *obj, size_t n) {
    const unsigned char *p = obj; /* object bytes have no sign */
    unsigned sum = 0;
    for (size_t i = 0; i < n; ++i) {
        sum += p[i];              /* 0..255 exactly */
    }
    return sum;
}
```

## See Also

- [c-ptr-strict-alias](ptr-strict-alias.md) - why character types are the allowed byte view
- [c-ptr-const-params](ptr-const-params.md) - the qualifiers on the inspection pointer
