---
id: c-test-tsan-threaded
lang: c
prefix: test
title: Run threaded tests under ThreadSanitizer
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ThreadSanitizer, data race, CI, threads]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-conc-atomic-shared, c-proj-sanitizers]
sources:
  - title: Clang - ThreadSanitizer
    url: https://clang.llvm.org/docs/ThreadSanitizer.html
---
> Build the threaded tests with `-fsanitize=thread` and fix every report.

## Why

ThreadSanitizer instruments memory accesses and synchronization to detect data races at run time, with stack traces for both conflicting accesses. Races are exactly the class of bug that ordinary tests miss: they need the right interleaving, and the compiler's optimizer can hide them. A race report is a real defect even when the test would have passed.

## Bad

```c
#include <pthread.h>

static int counter = 0;

void *worker(void *arg) {
    (void)arg;
    ++counter;   /* ThreadSanitizer reports this race in CI */
    return NULL;
}
```

## Good

```c
#include <pthread.h>
#include <stdatomic.h>

static atomic_int counter = 0;

void *worker(void *arg) {
    (void)arg;
    atomic_fetch_add(&counter, 1);
    return NULL;
}
```

## See Also

- [c-conc-atomic-shared](conc-atomic-shared.md) - the fix the report points to
- [c-proj-sanitizers](proj-sanitizers.md) - the ASan/UBSan configuration alongside it
