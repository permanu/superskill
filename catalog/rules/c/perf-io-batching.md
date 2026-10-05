---
id: c-perf-io-batching
lang: c
prefix: perf
title: Let stdio batch small reads instead of one syscall per byte
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [buffering, syscall, stdio, throughput]
  files: ["**/*.c"]
  symbols: [fgetc, read, setvbuf]
related: [c-io-fread-loop, c-perf-optimize-release]
sources:
  - title: cppreference - setvbuf
    url: https://en.cppreference.com/w/c/io/setvbuf
  - title: Linux man-pages - read(2)
    url: https://man7.org/linux/man-pages/man2/read.2.html
---
> Read through a buffered stream; per-byte system calls pay a kernel transition each time.

## Why

cppreference notes that the default buffer size `BUFSIZ` is expected to be the most efficient size for file I/O, and the buffered stream functions consume it in bulk. Calling `read` once per byte crosses the kernel boundary for every character, which dominates the work for anything larger than a few bytes. Streams exist to batch that traffic.

## Bad

```c
#include <unistd.h>

int count_lines(int fd) {
    int lines = 0;
    char c;
    while (read(fd, &c, 1) == 1) {   /* one syscall per byte */
        if (c == '\n') {
            ++lines;
        }
    }
    return lines;
}
```

## Good

```c
#include <stdio.h>

int count_lines(FILE *f) {
    int lines = 0;
    int c;
    while ((c = fgetc(f)) != EOF) {   /* stdio batches the reads */
        if (c == '\n') {
            ++lines;
        }
    }
    return lines;
}
```

## See Also

- [c-io-fread-loop](io-fread-loop.md) - completing bulk reads correctly
- [c-perf-optimize-release](perf-optimize-release.md) - the build the throughput is measured in
