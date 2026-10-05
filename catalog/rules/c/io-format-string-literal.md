---
id: c-io-format-string-literal
lang: c
prefix: io
title: Never pass input-controlled text as a format string
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [format string, printf, injection, "%n"]
  files: ["**/*.c", "**/*.h"]
  symbols: [printf, fprintf, snprintf]
related: [c-io-snprintf-truncation, c-io-scanf-width]
sources:
  - title: SEI CERT C - FIO30-C, exclude user input from format strings
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/input-output-fio/fio30-c/
---
> Keep format strings as literals and pass data through `%s`; never let input become the format.

## Why

A format string is executable: `%n` writes through an argument pointer, `%s` reads the stack, and mismatched directives crash the process, so an attacker who controls the format can read or write memory. When user text is passed as the format, every `%` in it becomes an instruction. The fix is to make the format constant and the data an argument.

## Bad

```c
#include <stdio.h>

void report(const char *user_text, int value) {
    printf(user_text, value);   /* % directives in user_text are evaluated */
}
```

## Good

```c
#include <stdio.h>

void report(const char *user_text, int value) {
    printf("%s: %d", user_text, value);   /* fixed format; data stays data */
}
```

## See Also

- [c-io-snprintf-truncation](io-snprintf-truncation.md) - handling the result of the fixed format
- [c-io-scanf-width](io-scanf-width.md) - the input-side format discipline
