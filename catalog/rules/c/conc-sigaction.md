---
id: c-conc-sigaction
lang: c
prefix: conc
title: Install signal handlers with sigaction, not signal
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sigaction, signal, handler, semantics]
  files: ["**/*.c", "**/*.h"]
  symbols: [sigaction, signal]
related: [c-conc-signal-shared, c-obs-signal-handler]
sources:
  - title: Linux man-pages - sigaction(2)
    url: https://man7.org/linux/man-pages/man2/sigaction.2.html
---
> Use `sigaction` so the handler's mask and flags are under the program's control.

## Why

`sigaction` is the documented system call for changing a signal's action and gives explicit control over the handler, the signal mask applied while it runs, and the flags. The older `signal` interface has implementation-dependent semantics, including whether the handler stays installed after the first delivery. When the handler must persist and run with a known mask, `sigaction` is the interface that states it.

## Bad

```c
#include <signal.h>

void install(void (*handler)(int)) {
    signal(SIGINT, handler);   /* semantics vary; the handler may be reset */
}
```

## Good

```c
#include <signal.h>
#include <stddef.h>

int install(void (*handler)(int)) {
    struct sigaction sa;
    sa.sa_handler = handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;
    return sigaction(SIGINT, &sa, NULL);   /* defined, persistent semantics */
}
```

## See Also

- [c-conc-signal-shared](conc-signal-shared.md) - what the handler may touch
- [c-obs-signal-handler](obs-signal-handler.md) - what the handler may log
