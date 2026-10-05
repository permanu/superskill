---
id: c-unsafe-setjmp-volatile
lang: c
prefix: unsafe
title: Declare locals changed across longjmp as volatile
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [setjmp, longjmp, volatile, indeterminate]
  files: ["**/*.c", "**/*.h"]
  symbols: [setjmp, longjmp]
related: [c-unsafe-va-arg]
sources:
  - title: cppreference - setjmp
    url: https://en.cppreference.com/w/c/program/setjmp
---
> Mark every local that changes between setjmp and longjmp volatile, or keep the state outside the function.

## Why

When control returns through `longjmp`, non-volatile automatic variables local to the function containing `setjmp` have indeterminate values if they were changed after the `setjmp` call. The register or stack slot may hold a value from either side of the jump, so state read after recovery can be stale. `volatile` forces the value through memory and makes the post-jump read defined.

## Bad

```c
#include <setjmp.h>

static jmp_buf env;

void recover(void) {
    longjmp(env, 1);
}

int run(void) {
    int state = 0;
    if (setjmp(env) == 0) {
        state = 1;
        recover();
    }
    return state;   /* changed since setjmp: indeterminate */
}
```

## Good

```c
#include <setjmp.h>

static jmp_buf env;

void recover(void) {
    longjmp(env, 1);
}

int run(void) {
    volatile int state = 0;
    if (setjmp(env) == 0) {
        state = 1;
        recover();
    }
    return state;   /* volatile survives the longjmp */
}
```

## See Also

- [c-unsafe-va-arg](unsafe-va-arg.md) - the other function-contract type rule
