---
id: c-err-out-params
lang: c
prefix: err
title: Write out-parameters only after every fallible step has succeeded
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [out parameter, partial result, status, failure]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-err-status-return, c-err-partial-cleanup, c-err-goto-cleanup]
sources:
  - title: SEI CERT C - ERR02-C, avoid in-band error indicators
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/error-handling-err/err02-c/
---
> Publish out-parameters exactly once, after all failure points have passed; leave them untouched on failure.

## Why

A failed call that still wrote through an out-parameter leaves the caller's state half-updated. Callers routinely read the result before checking the status, so a partial value becomes real data. Committing outputs after the last fallible step makes the function transactional from the caller's point of view.

## Bad

```c
#include <stddef.h>

enum find_status { FIND_OK, FIND_EMPTY, FIND_TOO_LONG };

enum find_status find_first(const char *s, size_t *pos) {
    size_t i = 0;
    while (s[i] != '\0') {
        *pos = i;              /* published while the search can still fail */
        if (i == 1000000) {
            return FIND_TOO_LONG;
        }
        ++i;
    }
    if (i == 0) {
        return FIND_EMPTY;
    }
    return FIND_OK;
}
```

## Good

```c
#include <stddef.h>

enum find_status { FIND_OK, FIND_EMPTY, FIND_TOO_LONG };

enum find_status find_first(const char *s, size_t *pos) {
    size_t i = 0;
    while (s[i] != '\0') {
        if (i == 1000000) {
            return FIND_TOO_LONG;   /* *pos untouched */
        }
        ++i;
    }
    if (i == 0) {
        return FIND_EMPTY;          /* *pos untouched */
    }
    *pos = i;                       /* committed once, on success */
    return FIND_OK;
}
```

## See Also

- [c-err-status-return](err-status-return.md) - the status channel paired with these outputs
- [c-err-partial-cleanup](err-partial-cleanup.md) - the same commit-on-success principle for resources
- [c-err-goto-cleanup](err-goto-cleanup.md) - structuring the multiple failure exits
