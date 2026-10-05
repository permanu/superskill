---
id: c-io-exclusive-create
lang: c
prefix: io
title: Create files that must not be clobbered with exclusive mode
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exclusive create, wx, O_EXCL, TOCTOU]
  files: ["**/*.c", "**/*.h"]
  symbols: [fopen, open]
related: [c-io-fclose-check, c-io-fseek-check]
sources:
  - title: SEI CERT C - FIO45-C, avoid TOCTOU race conditions while accessing files
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/input-output-fio/fio45-c/
---
> Use exclusive creation (`"wx"` or `O_CREAT | O_EXCL`) instead of checking whether a file exists and then opening it.

## Why

Checking existence and opening in two steps leaves a race window: another process can create or replace the file between the calls, so the program overwrites data it meant to protect. Exclusive creation performs the check and the open atomically inside the operating system, and fails if the file already exists. The same rule covers temporary and lock files.

## Bad

```c
#include <stdio.h>

FILE *create_once(const char *path) {
    FILE *f = fopen(path, "r");
    if (f != NULL) {
        fclose(f);
        return NULL;   /* race window: the file can appear after the check */
    }
    return fopen(path, "w");
}
```

## Good

```c
#include <stdio.h>

FILE *create_once(const char *path) {
    return fopen(path, "wx");   /* exclusive creation fails if it exists */
}
```

## See Also

- [c-io-fclose-check](io-fclose-check.md) - confirming what was written
- [c-io-fseek-check](io-fseek-check.md) - the other file-position precondition
