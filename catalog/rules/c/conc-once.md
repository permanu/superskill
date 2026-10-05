---
id: c-conc-once
lang: c
prefix: conc
title: Initialize shared state exactly once with pthread_once
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [once, initialization, race, pthread_once]
  files: ["**/*.c", "**/*.h"]
  symbols: [pthread_once, PTHREAD_ONCE_INIT]
related: [c-conc-atomic-shared, c-conc-thread-join]
sources:
  - title: Linux man-pages - pthread_once(3)
    url: https://man7.org/linux/man-pages/man3/pthread_once.3.html
---
> Let `pthread_once` run the initializer; a hand-rolled check-then-init races.

## Why

The pthread_once page states that its purpose is to ensure a piece of initialization executes at most once, with the control variable statically initialized. The naive `if (!initialized) { initialized = 1; ... }` lets two threads both see false and both initialize, and adding a lock by hand is easy to get wrong. `pthread_once` gives every caller the guarantee with one control object.

## Bad

```c
static int initialized = 0;

void ensure_init(void) {
    if (!initialized) {           /* read outside any lock: both threads can enter */
        initialized = 1;
    }
}
```

## Good

```c
#include <pthread.h>

static pthread_once_t once = PTHREAD_ONCE_INIT;

static void do_init(void) {
    /* one-time setup */
}

void ensure_init(void) {
    pthread_once(&once, do_init);   /* exactly one thread runs do_init */
}
```

## See Also

- [c-conc-atomic-shared](conc-atomic-shared.md) - the type the hand-rolled flag would need
- [c-conc-thread-join](conc-thread-join.md) - the threads that rely on the initialization
