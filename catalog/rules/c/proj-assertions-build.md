---
id: c-proj-assertions-build
lang: c
prefix: proj
title: Keep NDEBUG out of source files and test a build with assertions enabled
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [NDEBUG, assert, build configuration, debug]
  files: ["**/*.c", "**/*.h"]
  symbols: [assert, NDEBUG]
related: [c-proj-warning-level, c-unsafe-assert-side-effects]
sources:
  - title: cppreference - assert
    url: https://en.cppreference.com/w/c/error/assert
---
> Let the build system decide NDEBUG, and run the test suite once with assertions active.

## Why

`assert` is compiled out when `NDEBUG` is defined at the point `<assert.h>` is included, so defining it inside a source file silently removes checks from that file alone and makes behavior depend on file order. Assertions are the cheapest way to catch invariant violations during development; if no configuration has them enabled, they never run at all. Keep the switch in the build and test both configurations.

## Bad

```c
#define NDEBUG   /* silently disables every assert in this file */
#include <assert.h>

int scale(int value) {
    assert(value >= 0);
    return value * 2;
}
```

## Good

```c
#include <assert.h>

int scale(int value) {
    assert(value >= 0);   /* NDEBUG is decided by the build, not the source */
    return value * 2;
}
```

## See Also

- [c-proj-warning-level](proj-warning-level.md) - the other diagnostic that must be on during development
- [c-unsafe-assert-side-effects](unsafe-assert-side-effects.md) - what must never be inside an assertion
