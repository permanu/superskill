---
id: c-obs-signal-handler
lang: c
prefix: obs
title: Never call the logging path from a signal handler
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [signal handler, async-signal-safe, stdio, logging]
  files: ["**/*.c", "**/*.h"]
  symbols: [fprintf, printf, write]
related: [c-obs-single-interface, c-obs-stderr-vs-stdout]
sources:
  - title: Linux man-pages - signal-safety(7)
    url: https://man7.org/linux/man-pages/man7/signal-safety.7.html
---
> In a signal handler, set a `sig_atomic_t` flag and log from the main loop instead.

## Why

The stdio functions are not async-signal-safe: a handler that calls `fprintf` while the main program is mid-call can operate on a half-updated buffer with unpredictable results. Signal-safety(7) explains that all stdio functions share static buffers and counters. A `volatile sig_atomic_t` flag defers the work to a context where logging is safe.

## Bad

```c
#include <signal.h>
#include <stdio.h>

void on_term(int sig) {
    fprintf(stderr, "terminating (%d)\n", sig);   /* not async-signal-safe */
}
```

## Good

```c
#include <signal.h>

static volatile sig_atomic_t got_term = 0;

void on_term(int sig) {
    (void)sig;
    got_term = 1;   /* only async-signal-safe work in the handler */
}
```

## See Also

- [c-obs-single-interface](obs-single-interface.md) - the logging path the main loop owns
- [c-obs-stderr-vs-stdout](obs-stderr-vs-stdout.md) - where the deferred diagnostic goes
