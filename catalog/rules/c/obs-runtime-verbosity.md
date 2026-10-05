---
id: c-obs-runtime-verbosity
lang: c
prefix: obs
title: Control verbosity from configuration, not by editing the source
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [verbosity, configuration, dynamic debug, runtime]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-obs-debug-default-off, c-obs-levels]
sources:
  - title: Linux kernel coding style - Printing kernel messages
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Read the verbosity threshold once at startup and gate messages on it at run time.

## Why

Kernel style's dynamic debug lets a running system enable messages without a rebuild, while per-file `#ifdef` edits require a new binary for every investigation. A threshold value read from configuration or the environment keeps the decision in operations hands and the source unchanged. It also lets tests exercise both the quiet and verbose paths.

## Bad

```c
#include <stdio.h>

void handle(int kind) {
#if VERBOSE
    fprintf(stderr, "handle kind=%d\n", kind);
#endif
}
```

## Good

```c
#include <stdio.h>

static int verbose = 0;   /* set from configuration at startup */

void handle(int kind) {
    if (verbose) {
        fprintf(stderr, "handle kind=%d\n", kind);
    }
}
```

## See Also

- [c-obs-debug-default-off](obs-debug-default-off.md) - the default when nothing is configured
- [c-obs-levels](obs-levels.md) - what the threshold compares against
