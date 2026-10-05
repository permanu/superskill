---
id: c-err-sentinel-type
lang: c
prefix: err
title: Store a sentinel-returning function's result in the function's own return type
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [EOF, sentinel, getc, character, return type]
  files: ["**/*.c", "**/*.h"]
  symbols: [getc, fgetc, getchar, EOF]
related: [c-err-errno-zero-before, c-err-check-return-values]
sources:
  - title: SEI CERT C - FIO34-C, distinguish between characters read from a file and EOF or WEOF
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/input-output-fio/fio34-c/
---
> Capture sentinel-returning results in the declared return type, never in a narrower type that can alias the sentinel.

## Why

Character input functions return `int` so that every byte value stays distinct from `EOF`. Narrowing the result to `char` can turn a valid character into the same value as `EOF` through sign extension, silently ending a loop and truncating input. The same hazard exists for wide input and `WEOF` when the result is stored in `wchar_t`.

## Bad

```c
#include <stdio.h>

int count_lines(FILE *f) {
    int lines = 0;
    char c;                               /* cannot hold every result value */
    while ((c = (char)getc(f)) != EOF) {  /* 0xFF can alias EOF and stop early */
        if (c == '\n') {
            ++lines;
        }
    }
    return lines;
}
```

## Good

```c
#include <stdio.h>

int count_lines(FILE *f) {
    int lines = 0;
    int c;                                /* the exact type getc returns */
    while ((c = getc(f)) != EOF) {
        if (c == '\n') {
            ++lines;
        }
    }
    return ferror(f) ? -1 : lines;        /* error is not end-of-file */
}
```

## See Also

- [c-err-errno-zero-before](err-errno-zero-before.md) - in-band indicators that require clearing `errno` first
- [c-err-check-return-values](err-check-return-values.md) - never discarding a failure-capable result at all
