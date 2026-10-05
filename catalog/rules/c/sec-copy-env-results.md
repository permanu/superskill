---
id: c-sec-copy-env-results
lang: c
prefix: sec
title: Copy values returned by getenv and friends before the next call
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [getenv, environment, static buffer, copy]
  files: ["**/*.c", "**/*.h"]
  symbols: [getenv, setlocale, strerror, localtime]
related: [c-err-strerror-copy, c-sec-hardcoded-secrets]
sources:
  - title: SEI CERT C - ENV34-C, do not store pointers returned by certain functions
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/environment-env/env34-c/
---
> Copy the string returned by `getenv`, `setlocale`, `strerror`, and the time conversions before any other call.

## Why

These functions may return a pointer to static storage that the next call in the same family overwrites, and `getenv` is not thread-safe. Keeping the pointer and comparing it later can read changed data: two different variables may compare equal because both pointers were overwritten. Copy immediately into caller-owned storage and use the copy.

## Bad

```c
#include <stdlib.h>
#include <string.h>

int same_env(void) {
    const char *a = getenv("TMP");
    const char *b = getenv("TEMP");   /* may overwrite the first result */
    return a != NULL && b != NULL && strcmp(a, b) == 0;
}
```

## Good

```c
#include <stdlib.h>
#include <string.h>

int same_env(void) {
    char a[256];
    const char *tmp = getenv("TMP");
    if (tmp == NULL || strlen(tmp) >= sizeof a) {
        return 0;
    }
    strcpy(a, tmp);                   /* copy before the next environment call */
    const char *b = getenv("TEMP");
    return b != NULL && strcmp(a, b) == 0;
}
```

## See Also

- [c-err-strerror-copy](err-strerror-copy.md) - the same lifetime rule for error strings
- [c-sec-hardcoded-secrets](sec-hardcoded-secrets.md) - reading secrets from the environment
