---
id: c-sec-close-on-exec
lang: c
prefix: sec
title: Open descriptors with close-on-exec so children cannot inherit them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [O_CLOEXEC, file descriptor, exec, leak]
  files: ["**/*.c", "**/*.h"]
  symbols: [open, O_CLOEXEC, fcntl]
related: [c-sec-file-mode, c-sec-descriptor-identity]
sources:
  - title: Linux man-pages - open(2)
    url: https://man7.org/linux/man-pages/man2/open.2.html
---
> Pass `O_CLOEXEC` on every descriptor a child process must not inherit.

## Why

Descriptors stay open across `exec` by default, so a secret file or socket opened by the parent remains accessible to every program it launches. Setting the flag later with `fcntl` leaves a race window in threaded programs. `O_CLOEXEC` sets the property atomically at creation, which is the only safe point.

## Bad

```c
#include <fcntl.h>
#include <unistd.h>

int open_secret(const char *path) {
    return open(path, O_RDONLY);   /* descriptor leaks into exec'd children */
}
```

## Good

```c
#include <fcntl.h>
#include <unistd.h>

int open_secret(const char *path) {
    return open(path, O_RDONLY | O_CLOEXEC);   /* closed on exec */
}
```

## See Also

- [c-sec-file-mode](sec-file-mode.md) - the other creation-time flag set
- [c-sec-descriptor-identity](sec-descriptor-identity.md) - what the descriptor represents
