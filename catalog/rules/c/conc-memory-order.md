---
id: c-conc-memory-order
lang: c
prefix: conc
title: Pair weaker memory orders or use the default sequential consistency
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [memory_order, release, acquire, relaxed, visibility]
  files: ["**/*.c", "**/*.h"]
  symbols: [memory_order_release, memory_order_acquire, memory_order_seq_cst]
related: [c-conc-atomic-shared, c-conc-volatile-not-sync]
sources:
  - title: cppreference - memory_order
    url: https://en.cppreference.com/w/c/atomic/memory_order
---
> A relaxed store publishes nothing; use release/acquire pairs or the default seq_cst ordering.

## Why

The memory_order documentation states that relaxed operations impose no synchronization or ordering, so a payload written before a relaxed flag store may not be visible to a thread that reads the flag. Release and acquire form a pair: the release makes prior writes visible to whichever acquire reads that value. Sequential consistency, the default, adds a single total order and is the safe starting point.

## Bad

```c
#include <stdatomic.h>

static atomic_int flag = 0;
static int payload = 0;

void publish(void) {
    payload = 42;
    atomic_store_explicit(&flag, 1, memory_order_relaxed);   /* no release: payload may not be visible */
}
```

## Good

```c
#include <stdatomic.h>

static atomic_int flag = 0;
static int payload = 0;

void publish(void) {
    payload = 42;
    atomic_store_explicit(&flag, 1, memory_order_release);   /* pairs with an acquire load */
}
```

## See Also

- [c-conc-atomic-shared](conc-atomic-shared.md) - making the flag atomic first
- [c-conc-volatile-not-sync](conc-volatile-not-sync.md) - what volatile fails to order
