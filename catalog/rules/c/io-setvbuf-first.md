---
id: c-io-setvbuf-first
lang: c
prefix: io
title: Set stream buffering before any other operation on the stream
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [setvbuf, buffering, stream setup, lifetime]
  files: ["**/*.c", "**/*.h"]
  symbols: [setvbuf, setbuf]
related: [c-io-fclose-check, c-io-fread-loop]
sources:
  - title: cppreference - setvbuf
    url: https://en.cppreference.com/w/c/io/setvbuf
---
> Call `setvbuf` after the stream is opened and before any other operation, and keep a user buffer alive until `fclose`.

## Why

Buffering mode is fixed once I/O begins: `setvbuf` may only be used after the stream is associated with an open file and before any other operation on it. The buffer's lifetime must also outlive the stream, so a stack buffer in a function that returns while the stream stays open becomes undefined behavior when the stream is later flushed. Configure once, at open time, with storage that lives as long as the stream.

## Bad

```c
#include <stdio.h>

int configure(FILE *f, char *buf, size_t n) {
    fputs("ready\n", f);
    return setvbuf(f, buf, _IOFBF, n);   /* too late: I/O already started */
}
```

## Good

```c
#include <stdio.h>

int configure(FILE *f, char *buf, size_t n) {
    if (setvbuf(f, buf, _IOFBF, n) != 0) {
        return -1;   /* must be set before any other operation on f */
    }
    return fputs("ready\n", f) == EOF ? -1 : 0;
}
```

## See Also

- [c-io-fclose-check](io-fclose-check.md) - the close that releases the buffer
- [c-io-fread-loop](io-fread-loop.md) - the I/O that must come after configuration
