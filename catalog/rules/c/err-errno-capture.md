---
id: c-err-errno-capture
lang: c
prefix: err
title: Copy errno into a local immediately on failure, before any other call
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [errno, errno_t, save, logging, clobber]
  files: ["**/*.c", "**/*.h"]
  symbols: [errno, strerror, perror]
related: [c-err-errno-after-failure, c-err-errno-zero-before, c-err-strerror-copy]
sources:
  - title: Linux man-pages - errno(3)
    url: https://man7.org/linux/man-pages/man3/errno.3.html
  - title: POSIX.1-2024 - errno
    url: https://pubs.opengroup.org/onlinepubs/9799919799/functions/errno.html
---
> Capture errno in a local on the failure path before any reporting or other call runs.

## Why

Any subsequent library call is allowed to change `errno`, including `printf` and `fprintf` on the path that reports the error. Reading `errno` after those calls can misdiagnose the failure or make a real error look like a different one. The number is valid at exactly one point: immediately after the failing call returns.

## Bad

```c
#include <errno.h>
#include <stdio.h>

int report_open(const char *path) {
    FILE *f = fopen(path, "r");
    if (f == NULL) {
        fprintf(stderr, "open failed\n");  /* may overwrite errno */
        if (errno == ENOENT) {
            fprintf(stderr, "no such file\n");
        }
        return -1;
    }
    fclose(f);
    return 0;
}
```

## Good

```c
#include <errno.h>
#include <stdio.h>

int report_open(const char *path) {
    FILE *f = fopen(path, "r");
    if (f == NULL) {
        int err = errno;                   /* capture before anything else */
        fprintf(stderr, "open failed\n");
        if (err == ENOENT) {
            fprintf(stderr, "no such file\n");
        }
        return -1;
    }
    fclose(f);
    return 0;
}
```

## See Also

- [c-err-errno-after-failure](err-errno-after-failure.md) - establishing that a failure happened before capturing
- [c-err-errno-zero-before](err-errno-zero-before.md) - clearing before calls with in-band failure indicators
- [c-err-strerror-copy](err-strerror-copy.md) - converting the captured number without losing it
