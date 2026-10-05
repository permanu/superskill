---
id: c-conc-thread-join
lang: c
prefix: conc
title: Join or detach every thread you create
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pthread_join, detach, thread resources, leak]
  files: ["**/*.c", "**/*.h"]
  symbols: [pthread_create, pthread_join, pthread_detach]
related: [c-conc-thread-args, c-conc-once]
sources:
  - title: Linux man-pages - pthread_create(3)
    url: https://man7.org/linux/man-pages/man3/pthread_create.3.html
---
> Every created thread ends in a join or a detach; otherwise its resources are never reclaimed.

## Why

The pthread_create page describes the ways a thread terminates and notes that its exit status is made available to another thread that calls `pthread_join`. A thread that is neither joined nor detached keeps its stack and bookkeeping until the process ends, so a program that creates threads in a loop leaks steadily. Join when the result is needed, detach when it is not.

## Bad

```c
#include <pthread.h>

void start(void *(*fn)(void *), void *arg) {
    pthread_t t;
    pthread_create(&t, NULL, fn, arg);   /* never joined or detached */
}
```

## Good

```c
#include <pthread.h>

int start(void *(*fn)(void *), void *arg) {
    pthread_t t;
    if (pthread_create(&t, NULL, fn, arg) != 0) {
        return -1;
    }
    return pthread_join(t, NULL);   /* resources reclaimed at join */
}
```

## See Also

- [c-conc-thread-args](conc-thread-args.md) - keeping the arguments alive until then
- [c-conc-once](conc-once.md) - the one-time setup a thread pool usually needs
