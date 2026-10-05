---
id: c-io-clearerr-retry
lang: c
prefix: io
title: Clear the stream's sticky error and end-of-file indicators before retrying
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [clearerr, ferror, retry, sticky error]
  files: ["**/*.c", "**/*.h"]
  symbols: [clearerr, ferror, feof]
related: [c-io-fread-loop, c-err-check-return-values]
sources:
  - title: cppreference - clearerr
    url: https://en.cppreference.com/w/c/io/clearerr
---
> Reset the error and end-of-file indicators with `clearerr` before retrying a stream operation you decided to recover from.

## Why

The error and end-of-file indicators are sticky: once set, `ferror` and `feof` keep reporting them until `clearerr` or a successful positioning call. A retried read can succeed, but code that tests the indicator still sees the old state, and once the end-of-file indicator is set, further reads return end-of-file immediately even when more data arrives. Clear the indicators at the recovery point so the stream's reported state matches the retry.

## Bad

```c
#include <stdio.h>

int read_next(FILE *f, char *buf, size_t n) {
    if (fgetc(f) == EOF) {
        /* handle end-of-file, then retry after more data arrives */
    }
    size_t got = fread(buf, 1, n, f);
    return got == n ? 0 : -1;   /* feof still set: the read returns 0 */
}
```

## Good

```c
#include <stdio.h>

int read_next(FILE *f, char *buf, size_t n) {
    if (fgetc(f) == EOF) {
        /* handle end-of-file, then retry after more data arrives */
        clearerr(f);   /* reset the EOF indicator before reading again */
    }
    size_t got = fread(buf, 1, n, f);
    return got == n ? 0 : -1;
}
```

## See Also

- [c-io-fread-loop](io-fread-loop.md) - reading until the requested amount is complete
- [c-err-check-return-values](err-check-return-values.md) - consuming the retry result
