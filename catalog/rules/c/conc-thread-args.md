---
id: c-conc-thread-args
lang: c
prefix: conc
title: Keep thread arguments alive until the thread is joined
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pthread_create, argument lifetime, stack, thread]
  files: ["**/*.c", "**/*.h"]
  symbols: [pthread_create, pthread_join]
related: [c-conc-thread-join, c-mem-no-dangling-return]
sources:
  - title: Linux man-pages - pthread_create(3)
    url: https://man7.org/linux/man-pages/man3/pthread_create.3.html
---
> Pass a pointer that outlives the thread; a stack local of the creator is a dangling argument.

## Why

The `arg` pointer is passed unchanged to the start routine, and the new thread may begin long after the creator continues, so a pointer to an automatic variable that goes out of scope is dangling before the thread ever reads it. The man page also notes that any thread calling `exit` terminates the whole process, which is why the argument's lifetime must be tied to a join. Use storage that lives until the join.

## Bad

```c
#include <pthread.h>

static void *worker(void *arg) {
    return arg;
}

void start(void) {
    int value = 7;
    pthread_t t;
    pthread_create(&t, NULL, worker, &value);   /* value dies before the thread runs */
}
```

## Good

```c
#include <pthread.h>

static int shared_value = 7;

static void *worker(void *arg) {
    return arg;
}

void start(void) {
    pthread_t t;
    pthread_create(&t, NULL, worker, &shared_value);   /* outlives the thread */
    pthread_join(t, NULL);
}
```

## See Also

- [c-conc-thread-join](conc-thread-join.md) - the join that bounds the lifetime
- [c-mem-no-dangling-return](mem-no-dangling-return.md) - the same rule for returning pointers
