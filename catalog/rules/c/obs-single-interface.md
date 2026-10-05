---
id: c-obs-single-interface
lang: c
prefix: obs
title: Route messages through one logging interface
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging interface, sink, consistency, stderr]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-obs-module-tag, c-obs-levels]
sources:
  - title: Linux kernel coding style - Printing kernel messages
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Call one project logging function instead of writing to streams from everywhere.

## Why

Kernel style funnels messages through the `pr_*` and `dev_*` families so that level, formatting, and destination are decided in one place. When every module calls `fprintf` or `printf` directly, changing the destination, adding a timestamp, or enforcing a prefix means touching every call site, and some inevitably get missed. One interface makes logging policy a single decision.

## Bad

```c
#include <stdio.h>

void read_config(const char *path) {
    fprintf(stderr, "opening %s\n", path);
    printf("config loaded\n");   /* second sink, different stream */
}
```

## Good

```c
#include <stdio.h>

static void log_line(const char *msg, const char *detail) {
    fprintf(stderr, "app: %s%s\n", msg, detail);
}

void read_config(const char *path) {
    log_line("opening ", path);
}
```

## See Also

- [c-obs-module-tag](obs-module-tag.md) - the prefix the single interface can enforce
- [c-obs-levels](obs-levels.md) - the level the single interface can classify
