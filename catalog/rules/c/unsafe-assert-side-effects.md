---
id: c-unsafe-assert-side-effects
lang: c
prefix: unsafe
title: Keep side effects out of assert expressions
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assert, NDEBUG, side effect, diagnostics]
  files: ["**/*.c", "**/*.h"]
  symbols: [assert]
related: [c-err-detect-not-exit, c-unsafe-eval-order]
sources:
  - title: cppreference - assert
    url: https://en.cppreference.com/w/c/error/assert
---
> Put only the condition in `assert`; perform the work in a statement that always runs.

## Why

When `NDEBUG` is defined, `assert` expands to nothing, so any side effect inside the expression disappears in release builds and the program silently changes behavior. Assertions are for documenting invariants that must already hold, not for performing updates. Keep the work outside and let the assertion observe the result.

## Bad

```c
#include <assert.h>

int pop(int *count) {
    assert((*count)-- > 0);   /* removed under NDEBUG, decrement lost */
    return 0;
}
```

## Good

```c
#include <assert.h>

int pop(int *count) {
    if (*count <= 0) {
        return -1;
    }
    assert(*count > 0);   /* assertions observe, they do not act */
    --*count;
    return 0;
}
```

## See Also

- [c-err-detect-not-exit](err-detect-not-exit.md) - the termination behavior assert relies on
- [c-unsafe-eval-order](unsafe-eval-order.md) - side effects that must have a defined order
