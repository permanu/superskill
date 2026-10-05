---
id: c-err-strerror-copy
lang: c
prefix: err
title: Copy strerror's text into caller-owned storage before the next call
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [strerror, strerror_r, error message, thread safety]
  files: ["**/*.c", "**/*.h"]
  symbols: [strerror, strerror_r, strerror_l]
related: [c-err-errno-capture]
sources:
  - title: Linux man-pages - strerror(3)
    url: https://man7.org/linux/man-pages/man3/strerror.3.html
  - title: POSIX.1-2024 - strerror
    url: https://pubs.opengroup.org/onlinepubs/9799919799/functions/strerror.html
---
> Copy the message returned by strerror into your own buffer immediately, and use the reentrant strerror_r where lifetime or concurrency matters.

## Why

`strerror` returns a pointer to storage that the implementation may reuse; the next `strerror` call in the same thread can invalidate it, and in older libraries the call is not thread-safe at all. Returning or storing that pointer turns a later use into a use-after-replace or a data race. `strerror_r` writes into caller-owned memory and reports `ERANGE` or `EINVAL` instead of silently reusing shared state.

## Bad

```c
#include <string.h>

/* The returned pointer is invalidated by the next strerror call. */
const char *describe_error(int errnum) {
    return strerror(errnum);
}
```

## Good

```c
#include <string.h>

int describe_error(int errnum, char *buf, size_t cap) {
    if (cap == 0) {
        return -1;
    }
    if (strerror_r(errnum, buf, cap) != 0) {  /* XSI-compliant overload */
        return -1;
    }
    buf[cap - 1] = '\0';
    return 0;
}
```

## See Also

- [c-err-errno-capture](err-errno-capture.md) - capturing the number whose text this rule copies
