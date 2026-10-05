---
id: c-mem-no-dangling-return
lang: c
prefix: mem
title: Never return or retain a pointer to automatic storage
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [storage duration, dangling, stack, return pointer]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-mem-use-after-free, c-mem-zero-init]
sources:
  - title: SEI CERT C - DCL30-C, declare objects with appropriate storage durations
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/declarations-and-initialization-dcl/dcl30-c/
---
> Match every pointer's storage duration to how long its referent must live; automatic objects die at return.

## Why

An automatic object's lifetime ends when its block exits, so any pointer that outlives it is dangling and its use is undefined behavior. Storing the address in a static or returning it produces a value that looks valid and can pass through several call frames before it is read. Choose static storage for constant data and allocated storage for per-call results.

## Bad

```c
#include <stdio.h>

static const char *last;

void make_greeting(void) {
    char buf[32] = "hello";
    last = buf;        /* automatic storage dies at return */
}

const char *get_greeting(void) {
    return last;       /* dangling */
}
```

## Good

```c
#include <stdio.h>

static char greeting[] = "hello";

const char *get_greeting(void) {
    return greeting;   /* static storage lives for the whole program */
}
```

## See Also

- [c-mem-use-after-free](mem-use-after-free.md) - the allocated-storage version of the same rule
- [c-mem-zero-init](mem-zero-init.md) - the other half of using storage correctly
