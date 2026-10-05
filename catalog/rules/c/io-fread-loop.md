---
id: c-io-fread-loop
lang: c
prefix: io
title: Loop until a read fills the requested amount or the stream ends
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fread, short read, feof, ferror]
  files: ["**/*.c", "**/*.h"]
  symbols: [fread, feof, ferror]
related: [c-io-clearerr-retry, c-err-eintr-retry]
sources:
  - title: cppreference - fread
    url: https://en.cppreference.com/w/c/io/fread
---
> Treat a short read as normal, keep reading until the buffer is full or the stream reports end-of-file or error.

## Why

`fread` returns the number of complete objects read, which can be less than requested whenever the stream has fewer bytes available, not only at end-of-file. A single call that assumes a full buffer leaves the tail of the destination indeterminate, and `fread` does not say whether it stopped for EOF or an error. Loop on the partial count and use `feof` and `ferror` to classify the stop.

## Bad

```c
#include <stdio.h>

int load_header(FILE *f, unsigned char *buf, size_t n) {
    fread(buf, 1, n, f);   /* short read leaves the tail uninitialized */
    return 0;
}
```

## Good

```c
#include <stdio.h>

int load_header(FILE *f, unsigned char *buf, size_t n) {
    size_t got = 0;
    while (got < n) {
        size_t chunk = fread(buf + got, 1, n - got, f);
        if (chunk == 0) {
            if (ferror(f)) {
                return -1;
            }
            return 0;      /* end-of-file before the header was complete */
        }
        got += chunk;
    }
    return 1;              /* full header loaded */
}
```

## See Also

- [c-io-clearerr-retry](io-clearerr-retry.md) - recovering from a reported stream error
- [c-err-eintr-retry](err-eintr-retry.md) - the same loop discipline for descriptor I/O
