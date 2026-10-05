---
id: c-io-epipe
lang: c
prefix: io
title: Treat EPIPE as a normal pipe closure, not a failure
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [EPIPE, SIGPIPE, write, pipe, socket]
  files: ["**/*.c", "**/*.h"]
  symbols: [write, errno, EPIPE]
related: [c-err-eintr-retry, c-err-errno-capture]
sources:
  - title: Linux man-pages - write(2)
    url: https://man7.org/linux/man-pages/man2/write.2.html
---
> Handle EPIPE from `write` as the reader having closed, and keep SIGPIPE from turning it into process death.

## Why

Writing to a pipe or socket whose reading end is closed fails with `EPIPE` and also raises `SIGPIPE`, which terminates the process by default before the return value is ever seen. For a daemon or library writer, that is an ordinary peer close, not a crash condition. Decide the SIGPIPE disposition deliberately and treat `EPIPE` as a defined end of the conversation.

## Bad

```c
#include <unistd.h>

int notify(int fd, const char *msg, size_t n) {
    return write(fd, msg, n) < 0 ? -1 : 0;   /* EPIPE is treated as a generic error */
}
```

## Good

```c
#include <errno.h>
#include <unistd.h>

int notify(int fd, const char *msg, size_t n) {
    ssize_t rc = write(fd, msg, n);
    if (rc < 0) {
        if (errno == EPIPE) {
            return 0;   /* reader closed: normal end for a pipe writer */
        }
        return -1;
    }
    return rc == (ssize_t)n ? 0 : -1;
}
```

## See Also

- [c-err-eintr-retry](err-eintr-retry.md) - the other write outcome that is not a real failure
- [c-err-errno-capture](err-errno-capture.md) - reading errno safely on this path
