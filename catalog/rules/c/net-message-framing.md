---
id: c-net-message-framing
lang: c
prefix: net
title: Frame stream messages explicitly with a length prefix
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tcp, framing, message boundary, length prefix]
  files: ["**/*.c"]
  symbols: [recv, send]
related: [c-net-shutdown-eof, c-conv-endian-explicit]
sources:
  - title: Linux man-pages - tcp(7)
    url: https://man7.org/linux/man-pages/man7/tcp.7.html
---
> Send a length before the payload and read exactly that many bytes; a stream socket preserves bytes, not records.

## Why

The tcp(7) page states plainly that TCP does not preserve record boundaries, so one `recv` can return part of a message, several messages, or a split at any byte. Code that treats a read as one message works on small local tests and fails on real networks. A length prefix makes the frame explicit, and reading with a fixed count completes it.

## Bad

```c
#include <sys/socket.h>
#include <unistd.h>

int read_message(int fd, char *buf, size_t cap) {
    ssize_t n = recv(fd, buf, cap, 0);
    return n > 0 ? (int)n : -1;   /* assumes one recv equals one message */
}
```

## Good

```c
#include <stddef.h>
#include <sys/socket.h>
#include <unistd.h>

int read_message(int fd, char *buf, size_t cap, size_t *msg_len) {
    unsigned char header[4];
    if (recv(fd, header, sizeof header, MSG_WAITALL) != (ssize_t)sizeof header) {
        return -1;
    }
    size_t need = ((size_t)header[0] << 24) | ((size_t)header[1] << 16) |
                  ((size_t)header[2] << 8) | header[3];
    if (need > cap) {
        return -1;   /* the length prefix defines the frame */
    }
    if (recv(fd, buf, need, MSG_WAITALL) != (ssize_t)need) {
        return -1;
    }
    *msg_len = need;
    return 0;
}
```

## See Also

- [c-net-shutdown-eof](net-shutdown-eof.md) - marking the end of the stream
- [c-conv-endian-explicit](conv-endian-explicit.md) - the byte order of the header
