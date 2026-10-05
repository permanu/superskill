---
id: c-unsafe-ctype-domain
lang: c
prefix: unsafe
title: Cast to unsigned char before calling ctype functions
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ctype, isalpha, unsigned char, EOF, argument domain]
  files: ["**/*.c", "**/*.h"]
  symbols: [isalpha, isspace, isdigit, toupper, tolower]
related: [c-unsafe-char-signedness, c-err-sentinel-type]
sources:
  - title: SEI CERT C - STR37-C, arguments to character-handling functions must be representable as an unsigned char
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/characters-and-strings-str/str37-c/
---
> Pass ctype functions either EOF or a value converted through unsigned char.

## Why

The `<ctype.h>` functions accept an `int` whose value must equal `EOF` or be representable as `unsigned char`. A negative `char` argument violates that domain and is undefined behavior; implementations use the negative range for table indexing, so the failure is real, not theoretical. Cast through `unsigned char` at every call that takes character data.

## Bad

```c
#include <ctype.h>

int count_letters(const char *s) {
    int n = 0;
    for (; *s != '\0'; ++s) {
        if (isalpha(*s)) {   /* negative char values are not valid arguments */
            ++n;
        }
    }
    return n;
}
```

## Good

```c
#include <ctype.h>

int count_letters(const char *s) {
    int n = 0;
    for (; *s != '\0'; ++s) {
        if (isalpha((unsigned char)*s)) {
            ++n;
        }
    }
    return n;
}
```

## See Also

- [c-unsafe-char-signedness](unsafe-char-signedness.md) - why the plain char value can be negative
- [c-err-sentinel-type](err-sentinel-type.md) - keeping EOF and byte values distinct
