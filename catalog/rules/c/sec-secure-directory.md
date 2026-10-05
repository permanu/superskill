---
id: c-sec-secure-directory
lang: c
prefix: sec
title: Perform file operations in a directory others cannot modify
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [secure directory, permissions, TOCTOU, symlink]
  files: ["**/*.c", "**/*.h"]
  symbols: [stat, S_IWOTH, S_IWGRP]
related: [c-sec-descriptor-identity, c-io-exclusive-create]
sources:
  - title: SEI CERT C - FIO15-C, ensure that file operations are performed in a secure directory
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/input-output-fio/fio15-c/
---
> Check that the directory and its parents are not writable by group or others before operating there.

## Why

In a shared-writable directory such as `/tmp`, another user can replace a file or plant a symlink between operations, and a name-based access then acts on the wrong object. A secure directory is one where only the owner (and possibly the administrator) can create, rename, or delete entries. Check every component from the root to the leaf, so a writable parent cannot be used to swap the directory itself. Verifying that property before the operation removes the substitution path for the whole tree.

## Bad

```c
#include <stdio.h>

FILE *open_config(const char *dir) {
    char path[256];
    snprintf(path, sizeof path, "%s/config", dir);
    return fopen(path, "r");   /* the directory may be writable by others */
}
```

## Good

```c
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>

int secure_path(const char *path) {
    char prefix[256];
    size_t n = strlen(path);
    if (n >= sizeof prefix) return 0;
    memcpy(prefix, path, n + 1);
    for (size_t i = 1; i <= n; ++i) {
        if (prefix[i] != '/' && prefix[i] != '\0') continue;
        char save = prefix[i];
        prefix[i] = '\0';
        struct stat st;
        int ok = stat(prefix, &st) == 0 && S_ISDIR(st.st_mode) &&
                 (st.st_mode & (S_IWGRP | S_IWOTH)) == 0;
        prefix[i] = save;
        if (!ok) return 0;
    }
    return 1;   /* every component from the root to the leaf is secure */
}
```

## See Also

- [c-sec-descriptor-identity](sec-descriptor-identity.md) - using the descriptor once the directory is trusted
- [c-io-exclusive-create](io-exclusive-create.md) - creating entries without a race
