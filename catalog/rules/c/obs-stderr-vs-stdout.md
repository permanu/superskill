---
id: c-obs-stderr-vs-stdout
lang: c
prefix: obs
title: Send diagnostics to stderr and data to stdout
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [stderr, stdout, diagnostics, pipes]
  files: ["**/*.c", "**/*.h"]
  symbols: [stderr, stdout]
related: [c-obs-exit-status, c-obs-levels]
sources:
  - title: cppreference - stdin, stdout, stderr
    url: https://en.cppreference.com/w/c/io/std_streams
---
> Write error and status text to `stderr`; keep `stdout` for the program's actual output.

## Why

`stderr` is defined as the stream for diagnostic output and is not fully buffered, so messages appear even when `stdout` is redirected. A program that prints errors to `stdout` corrupts its own data when the output is piped into another tool, and the error may be buffered away entirely. Separating the two channels lets callers capture clean data and still see diagnostics.

## Bad

```c
#include <stdio.h>

int load_config(const char *path) {
    printf("cannot open %s\n", path);   /* diagnostic on the data channel */
    return -1;
}
```

## Good

```c
#include <stdio.h>

int load_config(const char *path) {
    fprintf(stderr, "cannot open %s\n", path);   /* diagnostics on stderr */
    return -1;
}
```

## See Also

- [c-obs-exit-status](obs-exit-status.md) - the status code that pairs with the diagnostic
- [c-obs-levels](obs-levels.md) - classifying what goes to the diagnostic channel
