---
id: c-conc-cv-loop
lang: c
prefix: conc
title: Wait on a condition variable in a loop that re-tests the predicate
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [condition variable, spurious wakeup, predicate, wait]
  files: ["**/*.c", "**/*.h"]
  symbols: [pthread_cond_wait]
related: [c-conc-lock-order, c-conc-thread-join]
sources:
  - title: Linux man-pages - pthread_cond_wait(3)
    url: https://man7.org/linux/man-pages/man3/pthread_cond_wait.3.html
  - title: POSIX.1-2024 - pthread_cond_wait
    url: https://pubs.opengroup.org/onlinepubs/9799919799/functions/pthread_cond_wait.html
---
> Re-evaluate the predicate after every return; a wait can end without the condition being true.

## Why

POSIX states that spurious wakeups from `pthread_cond_wait` may occur, so a return from the wait implies nothing about the predicate, which must be re-evaluated. The man page adds that the condition variable must be associated with the mutex that protects the predicate, which is why the wait is called with the lock held. A `while` loop around the wait supplies both properties; an `if` skips the re-check.

## Bad

```c
#include <pthread.h>

static pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t cv = PTHREAD_COND_INITIALIZER;
static int ready = 0;

void wait_ready(void) {
    pthread_mutex_lock(&m);
    if (!ready) {
        pthread_cond_wait(&cv, &m);   /* spurious wakeups skip the re-check */
    }
    pthread_mutex_unlock(&m);
}
```

## Good

```c
#include <pthread.h>

static pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t cv = PTHREAD_COND_INITIALIZER;
static int ready = 0;

void wait_ready(void) {
    pthread_mutex_lock(&m);
    while (!ready) {
        pthread_cond_wait(&cv, &m);   /* re-check after every wakeup */
    }
    pthread_mutex_unlock(&m);
}
```

## See Also

- [c-conc-lock-order](conc-lock-order.md) - the lock the predicate depends on
- [c-conc-thread-join](conc-thread-join.md) - the other way a wait ends
