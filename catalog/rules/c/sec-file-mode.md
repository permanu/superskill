---
id: c-sec-file-mode
lang: c
prefix: sec
title: Create private files with owner-only permissions from the start
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [permissions, "0600", umask, open, secret file]
  files: ["**/*.c", "**/*.h"]
  symbols: [open, O_CREAT, O_EXCL]
related: [c-sec-close-on-exec, c-sec-secure-directory]
sources:
  - title: Linux man-pages - open(2)
    url: https://man7.org/linux/man-pages/man2/open.2.html
---
> Pass restrictive permission bits when creating a private file; never rely on umask or a later chmod.

## Why

A file created with broad bits can be read by another user before a follow-up `chmod` narrows it, and `umask` is the environment's choice, not the program's. The mode passed to `open` is the only permission state the file ever has. `0600` makes it owner-only from creation, and `O_EXCL` refuses to follow a pre-existing entry.

## Bad

```c
#include <fcntl.h>
#include <unistd.h>

int create_key_file(const char *path) {
    return open(path, O_WRONLY | O_CREAT, 0666);   /* umask decides the final bits */
}
```

## Good

```c
#include <fcntl.h>
#include <unistd.h>

int create_key_file(const char *path) {
    return open(path, O_WRONLY | O_CREAT | O_EXCL, 0600);   /* owner-only */
}
```

## See Also

- [c-sec-close-on-exec](sec-close-on-exec.md) - the other creation-time flag
- [c-sec-secure-directory](sec-secure-directory.md) - where the file is allowed to live
