---
id: c-ffi-time-format
lang: c
prefix: ffi
title: Serialize time as fixed-width seconds, not time_t
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [time_t, epoch, serialization, width]
  files: ["**/*.h"]
  symbols: [time_t]
related: [c-ffi-wchar-format, c-ffi-offset-width]
sources:
  - title: cppreference - time_t
    url: https://en.cppreference.com/w/c/chrono/time_t
---
> Put a fixed-width epoch value in shared formats; keep time_t for local calls.

## Why

`time_t` is an implementation-defined arithmetic type: its width has changed historically and its epoch and units are not fixed by the standard. A shared format containing `time_t` therefore means different things on different systems. A fixed-width count of seconds since a stated epoch is one defined value everywhere; convert to `time_t` only at the local API boundary.

## Bad

```c
#include <time.h>

struct event {
    time_t when;   /* width and epoch vary across systems */
};
```

## Good

```c
#include <stdint.h>

struct event {
    int64_t unix_seconds;   /* fixed width and defined epoch */
};
```

## See Also

- [c-ffi-wchar-format](ffi-wchar-format.md) - the same rule for character data
- [c-ffi-offset-width](ffi-offset-width.md) - the same rule for file offsets
