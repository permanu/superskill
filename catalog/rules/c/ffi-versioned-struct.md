---
id: c-ffi-versioned-struct
lang: c
prefix: ffi
title: Give boundary structs a size field so they can grow
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ABI versioning, size field, ioctl, extension]
  files: ["**/*.h"]
  symbols: []
related: [c-ffi-packed-struct, c-doc-static-assert]
sources:
  - title: Linux kernel - (How to avoid) Botching up ioctls
    url: https://www.kernel.org/doc/html/latest/process/botching-up-ioctls.html
---
> Start a shared request struct with its size, and add fields only at the end.

## Why

The kernel's ioctl guidance assumes an interface will need a second iteration and asks for a clear way for the other side to tell which revision it is talking to, because getting the first version right is not guaranteed. A leading size field lets the receiver accept older and newer structs, and it turns a mismatched layout into a checkable condition. Fields are appended, never reordered or resized.

## Bad

```c
struct request {
    int opcode;
    int length;
};   /* no size or version: the layout cannot grow */
```

## Good

```c
#include <stdint.h>

struct request {
    uint32_t size;     /* sizeof(struct request): lets the receiver version it */
    uint32_t opcode;
    uint32_t length;
};
```

## See Also

- [c-ffi-packed-struct](ffi-packed-struct.md) - keeping the fields naturally aligned
- [c-doc-static-assert](doc-static-assert.md) - pinning the agreed size at compile time
