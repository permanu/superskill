---
id: c-io-fgets-newline
lang: c
prefix: io
title: Strip a newline with strchr, never with strlen minus one
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fgets, newline, strlen, strchr, empty string]
  files: ["**/*.c", "**/*.h"]
  symbols: [fgets, strchr, strlen]
related: [c-ptr-string-termination, c-io-scanf-width]
sources:
  - title: SEI CERT C - FIO37-C, do not assume that fgets() or fgetws() returns a nonempty string when successful
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/input-output-fio/fio37-c/
---
> Find the newline with `strchr` and write only when it exists; a successful `fgets` can still yield an empty string.

## Why

`fgets` succeeds when it reads any data, including a leading null byte from binary input, so the string length can be zero. Subtracting one from that length wraps to a huge value and writes outside the buffer. Searching for the newline with `strchr` and replacing it only when found removes both the wrap and the false assumption.

## Bad

```c
#include <stdio.h>
#include <string.h>

int read_line(char *buf, size_t cap) {
    if (fgets(buf, (int)cap, stdin) == NULL) {
        return -1;
    }
    buf[strlen(buf) - 1] = '\0';   /* wraps when the first byte is NUL */
    return 0;
}
```

## Good

```c
#include <stdio.h>
#include <string.h>

int read_line(char *buf, size_t cap) {
    if (fgets(buf, (int)cap, stdin) == NULL) {
        return -1;
    }
    char *nl = strchr(buf, '\n');
    if (nl != NULL) {
        *nl = '\0';                /* strip only when a newline exists */
    }
    return 0;
}
```

## See Also

- [c-ptr-string-termination](ptr-string-termination.md) - keeping scans inside the array
- [c-io-scanf-width](io-scanf-width.md) - the other bounded input primitive
