---
id: c-ffi-setjmp-context
lang: c
prefix: ffi
title: Use setjmp only in its allowed contexts and only for local recovery
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [setjmp, longjmp, jmp_buf, recovery]
  files: ["**/*.c", "**/*.h"]
  symbols: [setjmp, longjmp]
related: [c-unsafe-setjmp-volatile, c-err-detect-not-exit]
sources:
  - title: SEI CERT C - MSC22-C, use the setjmp(), longjmp() facility securely
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/miscellaneous-msc/msc22-c/
---
> Invoke setjmp as a controlling expression, keep the jump inside the function, and report errors normally across boundaries.

## Why

CERT requires `setjmp` to appear only in the controlling expression of a selection or loop statement; an assignment such as `int status = setjmp(buf);` is undefined behavior. It also forbids using `longjmp` to return to a function that has terminated. Across a library boundary the jump skips the library's cleanup and frame assumptions, so failures belong in return values.

## Bad

```c
#include <setjmp.h>

static jmp_buf buf;

int run(void) {
    int status = setjmp(buf);   /* setjmp outside a controlling expression */
    if (status == 0) {
        return 0;
    }
    return status;
}
```

## Good

```c
#include <setjmp.h>

static jmp_buf buf;

int run(void) {
    if (setjmp(buf) == 0) {   /* the allowed controlling-expression context */
        return 0;
    }
    return -1;   /* recovery stays inside this function */
}
```

## See Also

- [c-unsafe-setjmp-volatile](unsafe-setjmp-volatile.md) - which locals survive the jump
- [c-err-detect-not-exit](err-detect-not-exit.md) - reporting across boundaries instead
