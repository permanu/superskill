---
id: c-conc-signal-shared
lang: c
prefix: conc
title: Touch only sig_atomic_t or lock-free atomics in a signal handler
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [signal handler, sig_atomic_t, shared objects, race]
  files: ["**/*.c", "**/*.h"]
  symbols: [sig_atomic_t, volatile]
related: [c-conc-sigaction, c-obs-signal-handler]
sources:
  - title: SEI CERT C - SIG31-C, do not access shared objects in signal handlers
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/signals-sig/sig31-c/
  - title: Linux man-pages - signal-safety(7)
    url: https://man7.org/linux/man-pages/man7/signal-safety.7.html
---
> A handler communicates through `volatile sig_atomic_t` or a lock-free atomic and nothing else.

## Why

CERT states that accessing any shared object other than a `volatile sig_atomic_t` or a lock-free atomic from a handler is undefined behavior, because the main program can be interrupted mid-update. Signal-safety(7) explains the same problem for stdio's shared buffers. The handler should record the event in one such flag and return, leaving all other work to the interrupted flow.

## Bad

```c
#include <signal.h>

static int counter = 0;

void on_tick(int sig) {
    (void)sig;
    ++counter;   /* plain access from a handler races with the main program */
}
```

## Good

```c
#include <signal.h>

static volatile sig_atomic_t ticked = 0;

void on_tick(int sig) {
    (void)sig;
    ticked = 1;   /* only sig_atomic_t or lock-free atomics are safe */
}
```

## See Also

- [c-conc-sigaction](conc-sigaction.md) - installing the handler safely
- [c-obs-signal-handler](obs-signal-handler.md) - deferring the logging the same way
