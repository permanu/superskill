---
id: c-conc-reentrant-functions
lang: c
prefix: conc
title: Use the reentrant variants of library functions in threaded code
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [strtok, reentrant, thread safety, static state]
  files: ["**/*.c", "**/*.h"]
  symbols: [strtok, strtok_r]
related: [c-conc-atomic-shared, c-err-strerror-copy]
sources:
  - title: Linux man-pages - strtok(3)
    url: https://man7.org/linux/man-pages/man3/strtok.3.html
---
> Prefer `strtok_r` and the other `_r` variants; the plain functions keep state in shared storage.

## Why

The strtok page describes how a sequence of calls maintains a pointer that determines where the next token starts; that pointer lives in shared storage, so two threads tokenizing different strings interleave and corrupt each other's results. The `_r` variants keep the state in a caller-owned variable instead. The same pattern applies to the other library functions with hidden static state.

## Bad

```c
#include <string.h>

int count_fields(const char *text) {
    int n = 0;
    for (char *tok = strtok((char *)text, ","); tok != NULL; tok = strtok(NULL, ",")) {
        ++n;   /* strtok keeps state in shared storage */
    }
    return n;
}
```

## Good

```c
#include <string.h>

int count_fields(char *text) {
    int n = 0;
    char *save = NULL;
    for (char *tok = strtok_r(text, ",", &save); tok != NULL; tok = strtok_r(NULL, ",", &save)) {
        ++n;   /* the state lives in the caller's save variable */
    }
    return n;
}
```

## See Also

- [c-conc-atomic-shared](conc-atomic-shared.md) - the shared state that makes the plain versions unsafe
- [c-err-strerror-copy](err-strerror-copy.md) - the same hidden-storage problem for error strings
