---
id: c-ffi-wchar-format
lang: c
prefix: ffi
title: Keep wchar_t out of shared formats
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [wchar_t, width, wire format, unicode]
  files: ["**/*.h"]
  symbols: [wchar_t]
related: [c-conv-fixed-width, c-ffi-time-format]
sources:
  - title: cppreference - Numeric limits (WCHAR_MIN, WCHAR_MAX)
    url: https://en.cppreference.com/w/c/types/limits
---
> Serialize text as fixed-width code units, not as wchar_t.

## Why

`wchar_t` is an integer type whose range is implementation-defined; the limits header provides `WCHAR_MIN` and `WCHAR_MAX` precisely because the width differs between platforms, commonly 16 bits on Windows and 32 bits on Unix. A shared structure or file format containing `wchar_t` therefore changes size and meaning between platforms. Fixed-width code units make the format one defined sequence of bytes everywhere.

## Bad

```c
#include <stddef.h>

struct message {
    wchar_t text[32];   /* 2 bytes on Windows, 4 on Unix */
};
```

## Good

```c
#include <stdint.h>

struct message {
    uint32_t codepoints[32];   /* fixed width in a shared format */
};
```

## See Also

- [c-conv-fixed-width](conv-fixed-width.md) - the general rule for shared structures
- [c-ffi-time-format](ffi-time-format.md) - another implementation-defined type to keep out
