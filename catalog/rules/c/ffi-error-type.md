---
id: c-ffi-error-type
lang: c
prefix: ffi
title: Declare functions that return error numbers with a dedicated type
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [errno_t, error number, return type, boundary]
  files: ["**/*.h"]
  symbols: [errno_t]
related: [c-err-status-return, c-err-errno-capture]
sources:
  - title: SEI CERT C - DCL09-C, declare functions that return errno with a return type of errno_t
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/declarations-and-initialization-dcl/dcl09-c/
---
> Give an error-number return its own type so the declaration states what the value means.

## Why

CERT notes that a function declared to return `int` may return an error status, a value, or a combination, and the caller cannot tell from the declaration. `errno_t` makes the contract explicit at the boundary, and the same convention can be adopted where Annex K is not implemented with a one-line fallback typedef. Readers then know that a nonzero result is an error number, not data.

## Bad

```c
int open_stream(const char *path);   /* int could be a count, a flag, anything */
```

## Good

```c
#include <errno.h>

#ifndef __STDC_LIB_EXT1__
typedef int errno_t;
#endif

errno_t open_stream(const char *path);   /* clearly an error number */
```

## See Also

- [c-err-status-return](err-status-return.md) - the status convention this type spells out
- [c-err-errno-capture](err-errno-capture.md) - preserving the value behind the number
