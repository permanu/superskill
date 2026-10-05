---
id: c-obs-debug-default-off
lang: c
prefix: obs
title: Compile debug logging out by default
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [debug log, compiled out, pr_debug, verbosity]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-obs-runtime-verbosity, c-obs-levels]
sources:
  - title: Linux kernel coding style - Printing kernel messages
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Route development messages through a macro that expands to nothing unless debugging is enabled.

## Why

Kernel style's `pr_debug` and `dev_dbg` are compiled out by default so that debug tracing costs nothing in production and does not flood the log. Plain `printf`-style debugging left in the code prints in every build, which trains readers to ignore output and slows hot paths. A single debug macro keeps the calls in the source while the build decides whether they exist.

## Bad

```c
#include <stdio.h>

void handle_event(int kind) {
    fprintf(stderr, "event %d\n", kind);   /* debug noise in every build */
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

void handle_event(int kind) {
    debug_log("event %d\n", kind);   /* compiled out unless enabled */
}
```

## See Also

- [c-obs-runtime-verbosity](obs-runtime-verbosity.md) - enabling diagnostics without a rebuild
- [c-obs-levels](obs-levels.md) - where debug sits in the severity scale
