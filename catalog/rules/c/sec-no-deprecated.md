---
id: c-sec-no-deprecated
lang: c
prefix: sec
title: Replace obsolescent conversion functions with the checked strtol family
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [atoi, strtol, obsolescent, error detection]
  files: ["**/*.c", "**/*.h"]
  symbols: [atoi, atol, atof, strtol]
related: [c-err-errno-zero-before, c-conv-checked-narrow]
sources:
  - title: SEI CERT C - MSC24-C, do not use deprecated or obsolescent functions
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/miscellaneous-msc/msc24-c/
---
> Use `strtol`-family conversions, which report invalid input and range errors; never the `atoi` family.

## Why

The `atoi`, `atol`, and `atof` functions have no way to report failure: invalid text becomes zero and out-of-range values clamp silently, so a caller cannot distinguish "0" from "garbage". CERT lists them as obsolescent with the `strto*` functions as the replacement. The checked family returns an end pointer and sets `errno` on range errors, giving the caller enough information to reject bad input.

## Bad

```c
#include <stdlib.h>

int parse_count(const char *s) {
    return atoi(s);   /* invalid input silently becomes 0 */
}
```

## Good

```c
#include <errno.h>
#include <limits.h>
#include <stdlib.h>

int parse_count(const char *s, int *out) {
    errno = 0;
    char *end = NULL;
    long v = strtol(s, &end, 10);
    if (end == s || *end != '\0' || errno == ERANGE || v < 0 || v > INT_MAX) {
        return -1;
    }
    *out = (int)v;
    return 0;
}
```

## See Also

- [c-err-errno-zero-before](err-errno-zero-before.md) - the errno discipline behind this conversion
- [c-conv-checked-narrow](conv-checked-narrow.md) - the range test when narrowing the result
