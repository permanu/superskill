---
id: c-sec-descriptor-identity
lang: c
prefix: sec
title: Hold an open descriptor instead of re-identifying a file by name
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [TOCTOU, file descriptor, fstat, path, identity]
  files: ["**/*.c", "**/*.h"]
  symbols: [open, fstat, fopen]
related: [c-io-exclusive-create, c-sec-secure-directory]
sources:
  - title: SEI CERT C - FIO01-C, be careful using functions that use file names for identification
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/input-output-fio/fio01-c/
---
> Open once and inspect or use the descriptor; a file name can bind to a different object on every call.

## Why

A file name is only loosely bound to a file object, and the binding is reasserted on each call, so check-then-use by name gives an attacker a window to substitute a link or a different file. Descriptors and `FILE` pointers are bound by the operating system and keep referring to the same object. Inspect properties with `fstat` on the open descriptor instead of `stat` on the name.

## Bad

```c
#include <stdio.h>
#include <sys/stat.h>

int read_regular(const char *path) {
    struct stat st;
    if (stat(path, &st) != 0 || !S_ISREG(st.st_mode)) {
        return -1;
    }
    FILE *f = fopen(path, "r");   /* the name may bind to a different file */
    if (f == NULL) {
        return -1;
    }
    fclose(f);
    return 0;
}
```

## Good

```c
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>

int read_regular(const char *path) {
    int fd = open(path, O_RDONLY);   /* open once; the descriptor is the object */
    if (fd < 0) {
        return -1;
    }
    struct stat st;
    int ok = fstat(fd, &st) == 0 && S_ISREG(st.st_mode);
    close(fd);
    return ok ? 0 : -1;
}
```

## See Also

- [c-io-exclusive-create](io-exclusive-create.md) - atomic creation instead of check-then-open
- [c-sec-secure-directory](sec-secure-directory.md) - the directory permissions that make names trustworthy
