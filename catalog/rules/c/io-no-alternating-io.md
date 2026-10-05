---
id: c-io-no-alternating-io
lang: c
prefix: io
title: Flush or reposition between output and input on an update stream
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [update stream, fflush, fseek, alternating io]
  files: ["**/*.c", "**/*.h"]
  symbols: [fflush, fseek, fsetpos, rewind]
related: [c-io-fclose-check, c-io-fseek-check]
sources:
  - title: SEI CERT C - FIO39-C, do not alternately input and output from a stream without an intervening flush or positioning call
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/input-output-fio/fio39-c/
---
> Separate writes from reads on an update stream with `fflush` or a positioning call.

## Why

On a stream opened for update, output must not be directly followed by input without an intervening `fflush` or positioning call, and input must not be directly followed by output without repositioning unless end-of-file was reached. Violating either rule is undefined behavior, and the buffered read and write views can disagree. One explicit flush or seek between phases keeps the stream coherent.

## Bad

```c
#include <stdio.h>

int rewrite(FILE *f) {
    if (fputs("start", f) == EOF) {
        return -1;
    }
    int c = fgetc(f);   /* read directly after write: undefined behavior */
    return c;
}
```

## Good

```c
#include <stdio.h>

int rewrite(FILE *f) {
    if (fputs("start", f) == EOF) {
        return -1;
    }
    if (fflush(f) != 0) {
        return -1;
    }
    if (fseek(f, 0, SEEK_CUR) != 0) {
        return -1;      /* flush and position between output and input */
    }
    return fgetc(f);
}
```

## See Also

- [c-io-fclose-check](io-fclose-check.md) - the flush that happens at close
- [c-io-fseek-check](io-fseek-check.md) - checking the positioning call itself
