---
id: c-conc-volatile-not-sync
lang: c
prefix: conc
title: Volatile is not synchronization; use atomics for shared flags
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [volatile, synchronization, flag, atomics]
  files: ["**/*.c", "**/*.h"]
  symbols: [volatile, atomic_int]
related: [c-conc-atomic-shared, c-conc-memory-order]
sources:
  - title: cppreference - volatile type qualifier
    url: https://en.cppreference.com/w/c/language/volatile
---
> Use atomic types to communicate between threads; volatile only prevents caching within one thread.

## Why

`volatile` tells the compiler that a value may change outside the program's control, but it neither makes accesses indivisible nor orders them relative to other memory operations, and it says nothing about other threads. A volatile flag therefore races exactly like a plain one. Atomic types provide both atomicity and the ordering needed for one thread's writes to become visible to another.

## Bad

```c
static volatile int ready = 0;

void publish(void) {
    ready = 1;   /* volatile does not order or synchronize threads */
}
```

## Good

```c
#include <stdatomic.h>

static atomic_int ready = 0;

void publish(void) {
    atomic_store(&ready, 1);   /* atomics provide the ordering volatile does not */
}
```

## See Also

- [c-conc-atomic-shared](conc-atomic-shared.md) - the type that does synchronize
- [c-conc-memory-order](conc-memory-order.md) - choosing the ordering the store carries
