---
id: c-err-errno-after-failure
lang: c
prefix: err
title: Read errno only after the call's own out-of-band return value reports failure
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [errno, ftell, return value, failure detection]
  files: ["**/*.c", "**/*.h"]
  symbols: [errno, ftell, signal]
related: [c-err-errno-zero-before, c-err-errno-capture]
sources:
  - title: SEI CERT C - ERR30-C, take care when reading errno
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/error-handling-err/err30-c/
  - title: POSIX.1-2024 - errno
    url: https://pubs.opengroup.org/onlinepubs/9799919799/functions/errno.html
---
> For functions with an out-of-band failure indicator, test that indicator first; `errno` is valid only after failure has been established.

## Why

`errno` is set at program startup and never cleared by library functions, so it can hold a stale value from any earlier call. Functions such as `ftell` and `signal` reserve a return value for failure; checking `errno` before that value has signaled failure can report an error that never happened or attach the wrong error to a real failure.

## Bad

```c
#include <errno.h>
#include <stdio.h>

long file_position(FILE *f) {
    long pos = ftell(f);
    if (errno != 0) {          /* errno may be stale from an earlier call */
        perror("ftell");
        return -1;
    }
    return pos;
}
```

## Good

```c
#include <stdio.h>

long file_position(FILE *f) {
    long pos = ftell(f);
    if (pos == -1) {           /* -1 is ftell's out-of-band failure value */
        perror("ftell");       /* errno is meaningful only now */
        return -1;
    }
    return pos;
}
```

## See Also

- [c-err-errno-zero-before](err-errno-zero-before.md) - the opposite case, where there is no failure return at all
- [c-err-errno-capture](err-errno-capture.md) - preserving the value once failure is established
