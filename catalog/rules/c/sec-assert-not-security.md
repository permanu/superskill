---
id: c-sec-assert-not-security
lang: c
prefix: sec
title: Enforce security checks in production code, not in assert
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assert, NDEBUG, validation, trust boundary]
  files: ["**/*.c", "**/*.h"]
  symbols: [assert]
related: [c-unsafe-assert-side-effects, c-sec-sanitize-subsystem]
sources:
  - title: cppreference - assert
    url: https://en.cppreference.com/w/c/error/assert
---
> Validate untrusted data with a real branch that always executes; assertions document invariants only.

## Why

When `NDEBUG` is defined, `assert` expands to nothing, so any check written only as an assertion disappears from release builds — exactly the builds exposed to attackers. Assertions are for conditions that are already guaranteed by program logic; security checks must survive every configuration. Write the range, null, and length tests as ordinary `if` statements.

## Bad

```c
#include <assert.h>
#include <stddef.h>

int parse_frame(const unsigned char *data, size_t len, size_t *frame_len) {
    assert(data != NULL);   /* removed under NDEBUG */
    assert(len >= 4);
    *frame_len = ((size_t)data[0] << 8) | data[1];
    return 0;
}
```

## Good

```c
#include <stddef.h>

int parse_frame(const unsigned char *data, size_t len, size_t *frame_len) {
    if (data == NULL || frame_len == NULL || len < 4) {
        return -1;   /* enforced in production builds */
    }
    *frame_len = ((size_t)data[0] << 8) | data[1];
    return 0;
}
```

## See Also

- [c-unsafe-assert-side-effects](unsafe-assert-side-effects.md) - the side-effect variant of the same removal
- [c-sec-sanitize-subsystem](sec-sanitize-subsystem.md) - the validation these branches should perform
