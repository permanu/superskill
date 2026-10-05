---
id: c-obs-exit-status
lang: c
prefix: obs
title: Return a nonzero exit status when the program fails
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exit status, EXIT_FAILURE, CI, scripts]
  files: ["**/*.c"]
  symbols: [EXIT_SUCCESS, EXIT_FAILURE, exit]
related: [c-obs-stderr-vs-stdout, c-err-status-return]
sources:
  - title: cppreference - exit
    url: https://en.cppreference.com/w/c/program/exit
---
> Use `EXIT_FAILURE` on every failure path so callers, scripts, and CI can detect it.

## Why

`exit` distinguishes success (`0`/`EXIT_SUCCESS`) from failure (`EXIT_FAILURE`), and the status is the only machine-readable outcome a process leaves behind. A tool that reports failure on stderr but exits `0` looks successful to a shell script or build system, so automation proceeds on broken output. The status and the diagnostic belong together.

## Bad

```c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    FILE *f = fopen("out.txt", "w");
    if (f == NULL) {
        return EXIT_SUCCESS;   /* failure hidden from the caller */
    }
    fclose(f);
    return EXIT_SUCCESS;
}
```

## Good

```c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    FILE *f = fopen("out.txt", "w");
    if (f == NULL) {
        return EXIT_FAILURE;   /* scripts and CI can detect the failure */
    }
    fclose(f);
    return EXIT_SUCCESS;
}
```

## See Also

- [c-obs-stderr-vs-stdout](obs-stderr-vs-stdout.md) - the diagnostic that explains the status
- [c-err-status-return](err-status-return.md) - the same success/failure contract inside functions
