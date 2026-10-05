---
id: c-anti-fflush-input
lang: c
prefix: anti
title: Do not call fflush on an input stream
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fflush, stdin, input stream, undefined behavior]
  files: ["**/*.c", "**/*.h"]
  symbols: [fflush, fgetc]
related: [c-io-no-alternating-io, c-io-clearerr-retry]
sources:
  - title: cppreference - fflush
    url: https://en.cppreference.com/w/c/io/fflush
---
> Discard or reposition input with the input functions; `fflush` is undefined for input streams.

## Why

`fflush` is defined for output streams, and the standard leaves its behavior undefined for an input stream or an update stream whose last operation was input. The `fflush(stdin)` idiom found in older code relies on platform extensions and silently does nothing or misbehaves elsewhere. Consume the unwanted input with the input functions instead.

## Bad

```c
#include <stdio.h>

void drop_input(FILE *f) {
    fflush(f);   /* undefined for input streams */
}
```

## Good

```c
#include <stdio.h>

int drop_input(FILE *f) {
    int c;
    do {
        c = fgetc(f);
    } while (c != '\n' && c != EOF);   /* consume input explicitly */
    return c == EOF ? -1 : 0;
}
```

## See Also

- [c-io-no-alternating-io](io-no-alternating-io.md) - the flush that is defined, between output and input
- [c-io-clearerr-retry](io-clearerr-retry.md) - resetting input state the defined way
