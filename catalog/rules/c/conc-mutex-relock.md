---
id: c-conc-mutex-relock
lang: c
prefix: conc
title: Do not lock the same fast mutex twice
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mutex, recursive, deadlock, relock]
  files: ["**/*.c", "**/*.h"]
  symbols: [pthread_mutex_lock]
related: [c-conc-lock-order, c-conc-cv-loop]
sources:
  - title: Linux man-pages - pthread_mutex_lock(3)
    url: https://man7.org/linux/man-pages/man3/pthread_mutex_lock.3.html
---
> A default mutex is owned by one thread; locking it again from that thread deadlocks.

## Why

The man page states that a mutex is owned by one thread and that relocking a fast mutex from the owning thread suspends that thread until the mutex is unlocked — which it cannot do, so it deadlocks. Code that re-enters a locked section through a helper, or calls a locked function from another locked function, hits exactly this. Either restructure the lock boundary or use an explicitly recursive mutex, which the default is not.

## Bad

```c
#include <pthread.h>

static pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;

void nested(void) {
    pthread_mutex_lock(&m);
    pthread_mutex_lock(&m);   /* a fast mutex is not recursive */
    pthread_mutex_unlock(&m);
    pthread_mutex_unlock(&m);
}
```

## Good

```c
#include <pthread.h>

static pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;

static void update_locked(int value) {
    (void)value;   /* runs with m held */
}

void update(int value) {
    pthread_mutex_lock(&m);
    update_locked(value);   /* the helper assumes the lock is held */
    pthread_mutex_unlock(&m);
}
```

## See Also

- [c-conc-lock-order](conc-lock-order.md) - ordering when more than one lock is involved
- [c-conc-cv-loop](conc-cv-loop.md) - the other blocking hazard
