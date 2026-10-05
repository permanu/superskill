---
id: c-ptr-string-termination
lang: c
prefix: ptr
title: Pass null-terminated sequences only when the terminator is guaranteed
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [null terminator, string, buffer, bounds]
  files: ["**/*.c", "**/*.h"]
  symbols: [strlen, strcpy, printf]
related: [c-ptr-count-explicit, c-ptr-bounds-arith]
sources:
  - title: SEI CERT C - STR32-C, do not pass a non-null-terminated character sequence to a library function that expects a string
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/characters-and-strings-str/str32-c/
---
> Give string functions a sequence that is null-terminated, or pass an explicit length to a bounded operation.

## Why

Functions such as `printf`, `strlen`, and `strcpy` scan until they find a null byte; if the array was truncated to exactly its data bytes, the scan runs past the end and reads whatever follows. The bug is invisible at the declaration and only appears when the data fills the buffer. Size the storage with the terminator, or switch to a length-carrying interface.

## Bad

```c
#include <stdio.h>

void print_tag(void) {
    char tag[3] = {'a', 'b', 'c'};   /* no terminator */
    printf("%s\n", tag);             /* reads past the array */
}
```

## Good

```c
#include <stdio.h>

void print_tag(void) {
    char tag[] = "abc";              /* sized with the terminator */
    printf("%s\n", tag);
}
```

## See Also

- [c-ptr-count-explicit](ptr-count-explicit.md) - the length that bounded operations need instead
- [c-ptr-bounds-arith](ptr-bounds-arith.md) - keeping the scan inside the object
