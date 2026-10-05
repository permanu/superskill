---
id: c-conv-size-type
lang: c
prefix: conv
title: Use size_t for sizes, indices, and lengths
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [size_t, sizeof, index, length, loop counter]
  files: ["**/*.c", "**/*.h"]
  symbols: [size_t, sizeof]
related: [c-conv-checked-narrow, c-conv-pointer-difference]
sources:
  - title: SEI CERT C - INT01-C, use size_t for all integer values representing the size of an object
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/integers-int/int01-c/
---
> Declare object sizes, indices, and lengths as size_t; the type is guaranteed to cover any object.

## Why

`size_t` is the type of `sizeof` and is guaranteed to represent every object size, while `int` is not: on a large allocation, an `int` loop counter or byte count wraps and indexes outside the buffer. Mixed `int`/`size_t` expressions also drag the usual conversion rules into the loop condition. Using `size_t` end to end keeps sizes in one domain.

## Bad

```c
#include <stdlib.h>

char *copy_block(size_t n, const char *src) {
    char *p = malloc(n);
    if (p == NULL) {
        return NULL;
    }
    for (int i = 0; i < n; ++i) {   /* int counter against size_t bound */
        p[i] = src[i];
    }
    return p;
}
```

## Good

```c
#include <stdlib.h>

char *copy_block(size_t n, const char *src) {
    char *p = malloc(n);
    if (p == NULL) {
        return NULL;
    }
    for (size_t i = 0; i < n; ++i) {
        p[i] = src[i];
    }
    return p;
}
```

## See Also

- [c-conv-checked-narrow](conv-checked-narrow.md) - what happens when a size must narrow
- [c-conv-pointer-difference](conv-pointer-difference.md) - the signed counterpart for distances
