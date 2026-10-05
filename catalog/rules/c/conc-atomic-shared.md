---
id: c-conc-atomic-shared
lang: c
prefix: conc
title: Make every cross-thread variable atomic or mutex-protected
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [atomic, data race, shared state, counter]
  files: ["**/*.c", "**/*.h"]
  symbols: [atomic_int, atomic_fetch_add]
related: [c-conc-volatile-not-sync, c-conc-memory-order]
sources:
  - title: cppreference - Atomic types
    url: https://en.cppreference.com/w/c/language/atomic
---
> Give shared mutable state an atomic type or guard it with a mutex; plain access from two threads is a data race.

## Why

C's memory model makes concurrent access to a non-atomic object with at least one write undefined behavior, and the compiler may keep a plain counter in a register or reorder it around other statements. Atomic types make each access indivisible and give the value a defined modification order. Read-modify-write operations such as `atomic_fetch_add` also make increments safe without a lock.

## Bad

```c
static int ready = 0;

void publish(void) {
    ready = 1;   /* plain access: a data race with readers */
}
```

## Good

```c
#include <stdatomic.h>

static atomic_int ready = 0;

void publish(void) {
    atomic_fetch_add(&ready, 1);   /* all cross-thread access is atomic */
}
```

## See Also

- [c-conc-volatile-not-sync](conc-volatile-not-sync.md) - why volatile is not a substitute
- [c-conc-memory-order](conc-memory-order.md) - what the atomic operations order
