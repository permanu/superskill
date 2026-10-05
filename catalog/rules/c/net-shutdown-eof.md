---
id: c-net-shutdown-eof
lang: c
prefix: net
title: Signal end-of-stream with shutdown before closing
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [shutdown, close, EOF, half-close]
  files: ["**/*.c"]
  symbols: [shutdown, close, SHUT_WR]
related: [c-net-message-framing, c-io-fclose-check]
sources:
  - title: Linux man-pages - shutdown(2)
    url: https://man7.org/linux/man-pages/man2/shutdown.2.html
---
> Call `shutdown(fd, SHUT_WR)` to send end-of-stream, then `close` to release the descriptor.

## Why

The shutdown page documents that `SHUT_WR` disallows further transmissions on the socket, which is how a peer learns that no more data is coming; `close` only releases the descriptor and may discard unsent data or send a reset in some situations. A writer that closes without shutting down leaves the reader waiting for data that will never arrive, or loses the final bytes. Shut down first, then close.

## Bad

```c
#include <unistd.h>

int finish(int fd) {
    return close(fd);   /* close releases the descriptor but sends no EOF marker */
}
```

## Good

```c
#include <sys/socket.h>
#include <unistd.h>

int finish(int fd) {
    if (shutdown(fd, SHUT_WR) != 0) {
        return -1;
    }
    return close(fd);   /* shutdown signals EOF; close releases the descriptor */
}
```

## See Also

- [c-net-message-framing](net-message-framing.md) - the framing the EOF terminates
- [c-io-fclose-check](io-fclose-check.md) - checking the release of buffered streams
