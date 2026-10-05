---
id: c-obs-no-side-effect-args
lang: c
prefix: obs
title: Keep side effects out of log arguments
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [debug log, side effect, macro, arguments]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-obs-debug-default-off, c-unsafe-assert-side-effects]
sources:
  - title: Linux kernel coding style - Printing kernel messages
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Perform the update in a statement, then log the value; disabled logging must not change behavior.

## Why

Debug macros are compiled out or evaluated conditionally, so an increment or assignment placed in their argument list runs only when logging is enabled, and the program's behavior depends on the log configuration. Kernel style's `pr_debug` exists in both forms; the argument must be pure for that to be safe. Move the side effect out and pass the result.

## Bad

```c
#include <stdio.h>

#ifdef DEBUG
#define debug_log(...) fprintf(stderr, __VA_ARGS__)
#else
#define debug_log(...) ((void)0)
#endif

int pop(int *count) {
    debug_log("pop: %d\n", (*count)--);   /* decrement vanishes when disabled */
    return 0;
}
```

## Good

```c
#include <stdio.h>

#ifdef DEBUG
#define debug_log(...) fprintf(stderr, __VA_ARGS__)
#else
#define debug_log(...) ((void)0)
#endif

int pop(int *count) {
    if (*count <= 0) {
        return -1;
    }
    debug_log("pop: %d\n", *count);   /* log observes; the update is separate */
    --*count;
    return 0;
}
```

## See Also

- [c-obs-debug-default-off](obs-debug-default-off.md) - why the argument is not evaluated when disabled
- [c-unsafe-assert-side-effects](unsafe-assert-side-effects.md) - the same rule for assertions
