---
id: c-obs-levels
lang: c
prefix: obs
title: Classify messages by severity
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [log level, severity, error, warning]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-obs-module-tag, c-obs-runtime-verbosity]
sources:
  - title: Linux kernel coding style - Printing kernel messages
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Give every message a level so operators can filter by consequence, not by source order.

## Why

Kernel style routes messages through level-tagged helpers such as `pr_err`, `pr_warn`, and `pr_debug`, because a log where every line looks the same cannot be filtered or alerted on. A message that says `packet loss` without a level forces the reader to judge severity from context. The level is part of the message's contract: error, warning, or informational.

## Bad

```c
#include <stdio.h>

void on_packet_loss(int count) {
    fprintf(stderr, "packet loss\n");   /* severity is invisible */
    if (count > 100) {
        fprintf(stderr, "link is down\n");   /* same channel for everything */
    }
}
```

## Good

```c
#include <stdio.h>

void on_packet_loss(int count) {
    if (count > 100) {
        fprintf(stderr, "error: link down after %d losses\n", count);
    } else {
        fprintf(stderr, "warning: %d packets lost\n", count);
    }
}
```

## See Also

- [c-obs-module-tag](obs-module-tag.md) - the other half of a filterable prefix
- [c-obs-runtime-verbosity](obs-runtime-verbosity.md) - who decides which levels are printed
