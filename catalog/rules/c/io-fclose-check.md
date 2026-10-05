---
id: c-io-fclose-check
lang: c
prefix: io
title: Check the result of fclose on streams that were written to
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fclose, fflush, buffered write, data loss]
  files: ["**/*.c", "**/*.h"]
  symbols: [fclose, fflush]
related: [c-err-check-return-values, c-io-fread-loop]
sources:
  - title: cppreference - fclose
    url: https://en.cppreference.com/w/c/io/fclose
  - title: SEI CERT C - ERR33-C, detect and handle standard library errors
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/error-handling-err/err33-c/
---
> Check `fclose` after writing; the final flush is where buffered write errors surface.

## Why

`fclose` flushes any unwritten buffered data to the operating system, so a write error that `fprintf` did not report can still appear at close time. Ignoring the result reports success while the tail of the output was lost. Treat a nonzero `fclose` like any other failed write, and report the data loss to the caller.

## Bad

```c
#include <stdio.h>

int write_report(const char *path, int value) {
    FILE *f = fopen(path, "w");
    if (f == NULL) {
        return -1;
    }
    fprintf(f, "%d\n", value);
    fclose(f);            /* the final flush can fail silently */
    return 0;
}
```

## Good

```c
#include <stdio.h>

int write_report(const char *path, int value) {
    FILE *f = fopen(path, "w");
    if (f == NULL) {
        return -1;
    }
    if (fprintf(f, "%d\n", value) < 0) {
        fclose(f);
        return -1;
    }
    if (fclose(f) != 0) {   /* fclose flushes; failure means data loss */
        return -1;
    }
    return 0;
}
```

## See Also

- [c-err-check-return-values](err-check-return-values.md) - the general rule for failure-reporting calls
- [c-io-fread-loop](io-fread-loop.md) - the read side of partial transfers
