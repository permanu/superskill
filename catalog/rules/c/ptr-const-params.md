---
id: c-ptr-const-params
lang: c
prefix: ptr
title: Declare pointer parameters const when the callee does not write through them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [const, pointer parameters, interface, qualifiers]
  files: ["**/*.c", "**/*.h"]
  symbols: [const]
related: [c-ptr-no-const-cast, c-ptr-byte-access]
sources:
  - title: cppreference - const type qualifier
    url: https://en.cppreference.com/w/c/language/const
---
> Mark every pointer parameter the callee only reads as pointer-to-const.

## Why

A `const T *` parameter is a checked promise: it accepts borrowed buffers and string literals, documents that the callee does not modify the object, and lets the compiler place const objects in read-only storage. Omitting it forces callers that hold `const` data to cast, and each cast is a place where the promise silently disappears. The qualifier costs nothing at run time.

## Bad

```c
#include <stddef.h>

size_t count_byte(char *s, char needle) {   /* callee never writes through s */
    size_t n = 0;
    for (; *s != '\0'; ++s) {
        if (*s == needle) {
            ++n;
        }
    }
    return n;
}
```

## Good

```c
#include <stddef.h>

size_t count_byte(const char *s, char needle) {
    size_t n = 0;
    for (; *s != '\0'; ++s) {
        if (*s == needle) {
            ++n;
        }
    }
    return n;
}
```

## See Also

- [c-ptr-no-const-cast](ptr-no-const-cast.md) - what a cast at the call site would cost
- [c-ptr-byte-access](ptr-byte-access.md) - the byte view used for object representation
