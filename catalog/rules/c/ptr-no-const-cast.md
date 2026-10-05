---
id: c-ptr-no-const-cast
lang: c
prefix: ptr
title: Never cast away const and write through the result
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [const, cast, undefined behavior, read-only]
  files: ["**/*.c", "**/*.h"]
  symbols: [const]
related: [c-ptr-const-params]
sources:
  - title: SEI CERT C - EXP05-C, do not cast away a const qualification
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/expressions-exp/exp05-c/
  - title: cppreference - const type qualifier
    url: https://en.cppreference.com/w/c/language/const
---
> If an object must be modified, take a pointer to mutable storage; do not strip const with a cast.

## Why

Any attempt to modify an object whose type is const-qualified is undefined behavior, and the implementation may place it in read-only memory so the write faults. Casting away `const` only silences the compiler; it does not make the object writable. When a function genuinely needs to modify data, its parameter must be non-const and the caller must supply mutable storage.

## Bad

```c
#include <string.h>

int overwrite(const char *path) {
    char *p = (char *)path;   /* cast removes the promise */
    strcpy(p, "x");           /* undefined behavior if path is const */
    return 0;
}
```

## Good

```c
#include <string.h>

int copy_path(const char *path, char *out, size_t cap) {
    if (path == NULL || out == NULL) {
        return -1;
    }
    size_t n = strlen(path) + 1;
    if (n > cap) {
        return -1;
    }
    memcpy(out, path, n);     /* write into mutable storage instead */
    return 0;
}
```

## See Also

- [c-ptr-const-params](ptr-const-params.md) - declaring the read-only contract in the first place
