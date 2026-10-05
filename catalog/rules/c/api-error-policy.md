---
id: c-api-error-policy
lang: c
prefix: api
title: Adopt one error convention for every entry point
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error policy, status, convention, consistency]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-api-validate-params, c-err-status-return]
sources:
  - title: SEI CERT C - ERR00-C, adopt and implement a consistent and comprehensive error-handling policy
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/error-handling-err/err00-c/
---
> Pick one status representation and apply it to the whole API; mixed conventions defeat every caller's checks.

## Why

CERT's policy recommendation states that components should always generate status indicators and that consistency matters across critically similar parts. An API where one function returns nonzero for failure, another returns -1 with errno, and a third returns a count is impossible to use correctly from memory: each call site needs the right rule, and the wrong rule silently treats failure as success. One convention makes every check uniform.

## Bad

```c
#include <errno.h>

int load(const char *path) {
    (void)path;
    return 1;   /* nonzero means failure here */
}

int save(const char *path) {
    (void)path;
    errno = EIO;
    return -1;  /* and negative-with-errno here */
}
```

## Good

```c
enum io_status { IO_OK, IO_FAILED };

enum io_status load(const char *path) {
    (void)path;
    return IO_OK;   /* one convention for every entry point */
}

enum io_status save(const char *path) {
    (void)path;
    return IO_FAILED;
}
```

## See Also

- [c-api-validate-params](api-validate-params.md) - the checks that produce the status
- [c-err-status-return](err-status-return.md) - the status convention in detail
