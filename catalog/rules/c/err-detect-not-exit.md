---
id: c-err-detect-not-exit
lang: c
prefix: err
title: Detect and report errors in library code and let the application choose termination
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exit, abort, library, policy, propagation]
  files: ["**/*.c", "**/*.h"]
  symbols: [exit, abort, _Exit, quick_exit]
related: [c-err-log-once, c-err-check-return-values, c-err-status-return]
sources:
  - title: SEI CERT C - ERR05-C, application-independent code should provide error detection without dictating error handling
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/error-handling-err/err05-c/
  - title: Linux kernel coding style - Do not crash the kernel
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Application-independent code returns a status on every failure path; only application code decides to exit, abort, or retry.

## Why

A library cannot know whether its caller can recover, so calling `exit` or `abort` inside it destroys data and bypasses the caller's cleanup. The reverse mistake is just as bad: swallowing the error leaves the caller no indication that anything failed. Detect, report through the return value, and let the layer that owns the process decide what happens next.

## Bad

```c
#include <stdio.h>
#include <stdlib.h>

int load_port(const char *path, int *port) {
    FILE *f = fopen(path, "r");
    if (f == NULL) {
        fprintf(stderr, "cannot open %s\n", path);
        exit(EXIT_FAILURE);   /* library code ends the process */
    }
    int value = 0;
    if (fscanf(f, "%d", &value) != 1) {
        fclose(f);
        abort();              /* and again on bad data */
    }
    fclose(f);
    *port = value;
    return 0;
}
```

## Good

```c
#include <stdio.h>

enum port_status { PORT_OK, PORT_IO_ERROR, PORT_BAD_VALUE };

enum port_status load_port(const char *path, int *port) {
    FILE *f = fopen(path, "r");
    if (f == NULL) {
        return PORT_IO_ERROR;     /* report; the caller owns the policy */
    }
    int value = 0;
    int rc = fscanf(f, "%d", &value);
    fclose(f);
    if (rc != 1 || value < 1 || value > 65535) {
        return PORT_BAD_VALUE;
    }
    *port = value;
    return PORT_OK;
}
```

## See Also

- [c-err-log-once](err-log-once.md) - where the reporting layer may actually log
- [c-err-check-return-values](err-check-return-values.md) - callers must consume the returned status
- [c-err-status-return](err-status-return.md) - the status convention this rule propagates
