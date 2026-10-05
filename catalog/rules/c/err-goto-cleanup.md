---
id: c-err-goto-cleanup
lang: c
prefix: err
title: Unwind multi-resource functions through one forward goto chain with named cleanup labels
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [goto, cleanup, unwind, resource leak, single exit]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-err-partial-cleanup, c-err-alloc-failure, c-err-out-params]
sources:
  - title: SEI CERT C - MEM12-C, consider using a goto chain when leaving a function on error when using and releasing resources
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/memory-management-mem/mem12-c/
  - title: Linux kernel coding style - Centralized exiting of functions
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Give a function with multiple resources one forward goto cleanup chain with labels named for the work they undo.

## Why

Hand-written cleanup at every early return duplicates the release sequence, and adding a resource or a new error path silently skips one step, leaking a file descriptor or a block. A single forward chain makes every path pass through the same releases, and names such as `err_free_buffer` or `out_close` document what each label handles. `goto` stays inside one function body, which is what keeps the pattern auditable.

## Bad

```c
#include <stdio.h>
#include <stdlib.h>

int load_first(int *out) {
    FILE *f = fopen("/etc/hosts", "r");
    if (f == NULL) {
        return -1;
    }
    char *buf = malloc(4096);
    if (buf == NULL) {
        fclose(f);            /* cleanup copied on every error path */
        return -1;
    }
    if (fread(buf, 1, 4096, f) == 0 && ferror(f)) {
        fclose(f);            /* easy to add a path and miss one release */
        free(buf);
        return -1;
    }
    *out = buf[0];
    free(buf);
    fclose(f);
    return 0;
}
```

## Good

```c
#include <stdio.h>
#include <stdlib.h>

int load_first(int *out) {
    int rc = -1;
    FILE *f = NULL;
    char *buf = NULL;

    f = fopen("/etc/hosts", "r");
    if (f == NULL) goto out;
    buf = malloc(4096);
    if (buf == NULL) goto out;
    if (fread(buf, 1, 4096, f) == 0 && ferror(f)) goto out;
    *out = buf[0];
    rc = 0;
out:
    free(buf);                /* free(NULL) does nothing */
    if (f != NULL) {
        fclose(f);
    }
    return rc;
}
```

## See Also

- [c-err-partial-cleanup](err-partial-cleanup.md) - label granularity for failures in the middle of the chain
- [c-err-alloc-failure](err-alloc-failure.md) - keeping acquired pointers valid through the unwind
- [c-err-out-params](err-out-params.md) - committing the result only on the success path
