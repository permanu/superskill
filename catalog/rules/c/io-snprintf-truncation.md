---
id: c-io-snprintf-truncation
lang: c
prefix: io
title: Treat snprintf's return value at or above the buffer size as truncation
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [snprintf, truncation, buffer size, return value]
  files: ["**/*.c", "**/*.h"]
  symbols: [snprintf]
related: [c-io-format-string-literal, c-err-check-return-values]
sources:
  - title: cppreference - printf, fprintf, sprintf, snprintf
    url: https://en.cppreference.com/w/c/io/fprintf
---
> Compare `snprintf`'s result with the capacity before using the buffer; equal or larger means the output was cut.

## Why

`snprintf` writes at most `size - 1` characters and returns the number that would have been written, so a result of `size` or more means the string was truncated while the buffer stays null-terminated and looks valid. Using that truncated text as a complete value silently drops data. The return value is the only signal, and a negative result means an encoding error.

## Bad

```c
#include <stdio.h>

void show_value(char *buf, size_t cap, int value) {
    snprintf(buf, cap, "value=%d", value);   /* may truncate silently */
    puts(buf);
}
```

## Good

```c
#include <stdio.h>

int show_value(char *buf, size_t cap, int value) {
    int n = snprintf(buf, cap, "value=%d", value);
    if (n < 0 || (size_t)n >= cap) {
        return -1;   /* the would-be length does not fit in the buffer */
    }
    puts(buf);
    return 0;
}
```

## See Also

- [c-io-format-string-literal](io-format-string-literal.md) - the format string that produces the text
- [c-err-check-return-values](err-check-return-values.md) - why the negative case cannot be dropped
