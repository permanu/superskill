---
id: c-err-errno-zero-before
lang: c
prefix: err
title: Clear errno before a call whose failure is visible only through errno
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [errno, strtol, ERANGE, conversion, range error]
  files: ["**/*.c", "**/*.h"]
  symbols: [errno, strtol, strtod, ERANGE]
related: [c-err-errno-after-failure, c-err-errno-capture]
sources:
  - title: SEI CERT C - ERR30-C, take care when reading errno
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/error-handling-err/err30-c/
  - title: POSIX.1-2024 - errno
    url: https://pubs.opengroup.org/onlinepubs/9799919799/functions/errno.html
---
> When a function signals range errors only through errno, set errno to zero immediately before the call and test it immediately after.

## Why

`strtol`, `strtod`, and their relatives return the clamped maximum or minimum on overflow and mark the condition only in `errno`. Because `errno` is never cleared by the library, a leftover nonzero value from an unrelated call is indistinguishable from a real `ERANGE`. Clearing it before the call and checking it before any other call is the only reliable sequence.

## Bad

```c
#include <errno.h>
#include <limits.h>
#include <stdlib.h>

int parse_size(const char *s, long *out) {
    long v = strtol(s, NULL, 10);
    if (v == LONG_MAX && errno == ERANGE) {  /* stale errno can fake an error */
        return -1;
    }
    *out = v;
    return 0;
}
```

## Good

```c
#include <errno.h>
#include <stdlib.h>

int parse_size(const char *s, long *out) {
    errno = 0;                  /* strtol reports range errors only via errno */
    char *end = NULL;
    long v = strtol(s, &end, 10);
    if (end == s || *end != '\0' || errno == ERANGE) {
        return -1;              /* checked before any other call intervenes */
    }
    *out = v;
    return 0;
}
```

## See Also

- [c-err-errno-after-failure](err-errno-after-failure.md) - prefer the function's own failure return when one exists
- [c-err-errno-capture](err-errno-capture.md) - keep the value you just validated
