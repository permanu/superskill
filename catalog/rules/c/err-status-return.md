---
id: c-err-status-return
lang: c
prefix: err
title: Report failure through an explicit status return instead of overloading a result value
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error, status, return value, sentinel, API]
  files: ["**/*.c", "**/*.h"]
  symbols: [errno]
related: [c-err-out-params, c-err-check-return-values, c-err-detect-not-exit]
sources:
  - title: Linux kernel coding style - Function return values and names
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
  - title: SEI CERT C - ERR05-C, application-independent code should provide error detection without dictating error handling
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/error-handling-err/err05-c/
---
> Return an explicit status from operations that can fail; never encode failure in a value that is also a valid result.

## Why

Sentinel returns collide with valid data, so callers cannot branch reliably without extra knowledge of the API. `errno` is only meaningful after a failure has already been detected, so it cannot be the primary error channel. A consistent status return makes the failure contract part of the function signature and forces the caller to make one explicit decision.

## Bad

```c
#include <stddef.h>

/* Callers must guess whether (size_t)-1 means failure or a huge length. */
size_t normalized_length(const char *s) {
    size_t n = 0;
    while (s[n] != '\0') {
        ++n;
    }
    if (n > 1024) {
        return (size_t)-1;
    }
    return n;
}
```

## Good

```c
#include <stddef.h>

enum len_status { LEN_OK, LEN_TOO_LONG };

enum len_status normalized_length(const char *s, size_t *out) {
    size_t n = 0;
    while (s[n] != '\0') {
        ++n;
    }
    if (n > 1024) {
        return LEN_TOO_LONG;   /* failure is separate from the result */
    }
    *out = n;
    return LEN_OK;
}
```

## See Also

- [c-err-out-params](err-out-params.md) - where results may be written once this status contract is in place
- [c-err-check-return-values](err-check-return-values.md) - the caller side of the same contract
- [c-err-detect-not-exit](err-detect-not-exit.md) - what a reporting function does instead of acting on the error
