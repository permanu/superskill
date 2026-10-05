---
id: c-obs-rate-limit
lang: c
prefix: obs
title: Report a repeating condition once
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [log flood, rate limit, once, repeating]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-obs-debug-default-off, c-err-log-once]
sources:
  - title: Linux kernel coding style - Do not crash the kernel
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Emit the first occurrence of a repeating condition and suppress the rest.

## Why

Kernel style prefers `WARN_ON_ONCE` because a condition that fires once usually fires thousands of times, and the flood can wrap the log and slow the system until logging becomes its own outage. The same holds for retries and per-packet errors: the first line carries the information, the rest only add volume. A once flag keeps the signal and drops the noise.

## Bad

```c
#include <stdio.h>

void on_retry(int attempt) {
    fprintf(stderr, "retrying (%d)\n", attempt);   /* one line per attempt */
}
```

## Good

```c
#include <stdio.h>

void on_retry(int attempt) {
    static int reported = 0;
    if (!reported) {
        fprintf(stderr, "retrying; further attempts are not logged\n");
        reported = 1;   /* report the condition once, not every occurrence */
    }
}
```

## See Also

- [c-obs-debug-default-off](obs-debug-default-off.md) - another way output volume gets out of hand
- [c-err-log-once](err-log-once.md) - avoiding duplicates across layers rather than occurrences
