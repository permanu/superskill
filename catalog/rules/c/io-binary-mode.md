---
id: c-io-binary-mode
lang: c
prefix: io
title: Open binary payloads in binary mode
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [binary mode, fopen, text translation, bytes]
  files: ["**/*.c", "**/*.h"]
  symbols: [fopen, fread, fwrite]
related: [c-io-fread-loop, c-io-fclose-check]
sources:
  - title: cppreference - fopen
    url: https://en.cppreference.com/w/c/io/fopen
---
> Add the b flag when a stream carries bytes that are not line-oriented text.

## Why

A stream opened without `b` may translate line endings and treat control characters specially, so byte counts, offsets, and payloads no longer match the data on disk. Formats with headers, lengths, or checksums are corrupted by a single translated byte. Open any non-text payload with `"rb"` or `"wb"` so the stream is a byte channel.

## Bad

```c
#include <stdio.h>

int save_record(const char *path, const void *data, size_t n) {
    FILE *f = fopen(path, "w");   /* text mode may translate bytes */
    if (f == NULL) {
        return -1;
    }
    size_t written = fwrite(data, 1, n, f);
    if (fclose(f) != 0) {
        return -1;
    }
    return written == n ? 0 : -1;
}
```

## Good

```c
#include <stdio.h>

int save_record(const char *path, const void *data, size_t n) {
    FILE *f = fopen(path, "wb");  /* byte-exact channel */
    if (f == NULL) {
        return -1;
    }
    size_t written = fwrite(data, 1, n, f);
    if (fclose(f) != 0) {
        return -1;
    }
    return written == n ? 0 : -1;
}
```

## See Also

- [c-io-fread-loop](io-fread-loop.md) - reading a binary payload completely
- [c-io-fclose-check](io-fclose-check.md) - confirming the bytes reached the file
