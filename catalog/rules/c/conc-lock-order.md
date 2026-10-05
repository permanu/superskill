---
id: c-conc-lock-order
lang: c
prefix: conc
title: Lock multiple mutexes in one predefined order
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deadlock, lock order, mutex, circular wait]
  files: ["**/*.c", "**/*.h"]
  symbols: [pthread_mutex_lock]
related: [c-conc-mutex-relock, c-conc-cv-loop]
sources:
  - title: SEI CERT C - CON35-C, avoid deadlock by locking in a predefined order
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/concurrency-con/con35-c/
---
> Define one global order for acquiring mutexes and follow it everywhere.

## Why

CERT explains that deadlock requires a circular wait, and locking mutexes in a predefined order removes that condition. Two threads that take the same pair in opposite orders can each hold one lock and wait forever for the other. A documented order, such as by address or by a fixed ranking, makes the cycle impossible.

## Bad

```c
#include <pthread.h>

static pthread_mutex_t a = PTHREAD_MUTEX_INITIALIZER;
static pthread_mutex_t b = PTHREAD_MUTEX_INITIALIZER;

void swap(void) {
    pthread_mutex_lock(&b);
    pthread_mutex_lock(&a);   /* opposite order elsewhere: deadlock */
    pthread_mutex_unlock(&a);
    pthread_mutex_unlock(&b);
}
```

## Good

```c
#include <pthread.h>

static pthread_mutex_t a = PTHREAD_MUTEX_INITIALIZER;
static pthread_mutex_t b = PTHREAD_MUTEX_INITIALIZER;

void swap(void) {
    pthread_mutex_lock(&a);   /* one documented order for every caller */
    pthread_mutex_lock(&b);
    pthread_mutex_unlock(&b);
    pthread_mutex_unlock(&a);
}
```

## See Also

- [c-conc-mutex-relock](conc-mutex-relock.md) - not re-entering a lock already held
- [c-conc-cv-loop](conc-cv-loop.md) - the other classic blocking hazard
