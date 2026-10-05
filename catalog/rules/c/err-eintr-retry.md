---
id: c-err-eintr-retry
lang: c
prefix: err
title: Retry interrupted I/O and loop until the requested transfer completes or fails for real
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [EINTR, short read, short write, retry, signal]
  files: ["**/*.c", "**/*.h"]
  symbols: [read, write, EINTR]
related: [c-err-check-return-values]
sources:
  - title: Linux man-pages - read(2)
    url: https://man7.org/linux/man-pages/man2/read.2.html
---
> Loop on EINTR and partial transfers; treat only a real error as terminal.

## Why

A signal can interrupt a blocking transfer before any data moves, which is reported as EINTR and is not a failure. Similarly, a single call may transfer fewer bytes than requested. Treating either case as complete reports success with data missing, and treating EINTR as fatal aborts a transfer the caller can simply resume. Advancing the pointer by the transferred count and retrying is the contract POSIX defines.

## Bad

```c
#include <unistd.h>

ssize_t send_all(int fd, const void *buf, size_t len) {
    ssize_t n = write(fd, buf, len);
    if (n < 0) {
        return -1;      /* a signal interruption ends the transfer */
    }
    return n;           /* a short write is reported as complete */
}
```

## Good

```c
#include <errno.h>
#include <unistd.h>

int send_all(int fd, const void *buf, size_t len) {
    const unsigned char *p = buf;
    while (len > 0) {
        ssize_t n = write(fd, p, len);
        if (n < 0) {
            if (errno == EINTR) {
                continue;   /* interrupted before any byte: retry */
            }
            return -1;
        }
        p += n;
        len -= (size_t)n;
    }
    return 0;
}
```

## See Also

- [c-err-check-return-values](err-check-return-values.md) - why the transfer result cannot be discarded
