---
id: c-err-log-once
lang: c
prefix: err
title: Log a failure exactly once at the layer that owns recovery and report it upward elsewhere
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, reporting, boundary, duplicate logs]
  files: ["**/*.c", "**/*.h"]
  symbols: [fprintf, stderr]
related: [c-err-detect-not-exit, c-err-status-return]
sources:
  - title: SEI CERT C - ERR05-C, application-independent code should provide error detection without dictating error handling
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/error-handling-err/err05-c/
  - title: Linux kernel coding style - Do not crash the kernel
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Report a failure with a status from inner layers and write the diagnostic exactly once at the layer that decides how to respond.

## Why

When every internal layer logs and returns, one failure produces a stack of near-identical messages that bury the cause and train operators to ignore the log. Inner code cannot know whether the condition is expected, recoverable, or worth paging someone, so it should only report it. The boundary that owns the error policy adds the single diagnostic with full context.

## Bad

```c
#include <stdio.h>

int parse_port(const char *s, int *port) {
    int v = 0;
    if (sscanf(s, "%d", &v) != 1) {
        fprintf(stderr, "parse_port: bad input '%s'\n", s);
        return -1;
    }
    *port = v;
    return 0;
}

int apply_config(const char *s) {
    int port = 0;
    if (parse_port(s, &port) != 0) {
        fprintf(stderr, "apply_config: failed\n");  /* same failure, second log */
        return -1;
    }
    return 0;
}
```

## Good

```c
#include <stdio.h>

int parse_port(const char *s, int *port) {
    int v = 0;
    if (sscanf(s, "%d", &v) != 1) {
        return -1;                          /* report, do not log */
    }
    *port = v;
    return 0;
}

int apply_config(const char *s) {
    int port = 0;
    if (parse_port(s, &port) != 0) {
        fprintf(stderr, "invalid port setting\n");  /* one boundary log */
        return -1;
    }
    return 0;
}
```

## See Also

- [c-err-detect-not-exit](err-detect-not-exit.md) - the same boundary rules out exiting as a side effect
- [c-err-status-return](err-status-return.md) - the reporting channel the inner layers use instead of logging
