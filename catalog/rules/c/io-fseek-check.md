---
id: c-io-fseek-check
lang: c
prefix: io
title: Check fseek's result before reading from the new position
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fseek, file position, read, error]
  files: ["**/*.c", "**/*.h"]
  symbols: [fseek, ftell]
related: [c-io-fread-loop, c-err-check-return-values]
sources:
  - title: SEI CERT C - ERR33-C, detect and handle standard library errors
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/error-handling-err/err33-c/
---
> Test `fseek` before the read that depends on it; a failed seek leaves the old position in effect.

## Why

`fseek` returns nonzero on failure, and the stream stays where it was, so the following read returns bytes from the wrong region while looking successful. For record-oriented formats that means parsing one field as another, and for updates it can corrupt the file. A failed seek must abort the operation before any dependent I/O runs.

## Bad

```c
#include <stdio.h>

size_t read_at(FILE *f, long offset, void *buf, size_t n) {
    fseek(f, offset, SEEK_SET);   /* failure ignored: wrong region read */
    return fread(buf, 1, n, f);
}
```

## Good

```c
#include <stdio.h>

size_t read_at(FILE *f, long offset, void *buf, size_t n) {
    if (fseek(f, offset, SEEK_SET) != 0) {
        return 0;                  /* do not read from the wrong offset */
    }
    return fread(buf, 1, n, f);
}
```

## See Also

- [c-io-fread-loop](io-fread-loop.md) - completing the read once the position is right
- [c-err-check-return-values](err-check-return-values.md) - the general rule for ignored results
