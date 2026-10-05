---
id: c-err-check-return-values
lang: c
prefix: err
title: Consume every failure-reporting return value and annotate checked-return APIs with nodiscard
severity: must
enforce: both
tool: clang:-Wunused-result
baseline: latest
status: verified
triggers:
  keywords: [return value, nodiscard, unchecked, fclose, fwrite]
  files: ["**/*.c", "**/*.h"]
  symbols: [fwrite, fclose, fflush, nodiscard]
related: [c-err-status-return, c-err-sentinel-type, c-err-alloc-failure]
sources:
  - title: SEI CERT C - ERR33-C, detect and handle standard library errors
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/error-handling-err/err33-c/
  - title: cppreference - C attribute nodiscard
    url: https://en.cppreference.com/w/c/language/attributes/nodiscard
  - title: GCC - Common Function Attributes (warn_unused_result)
    url: https://gcc.gnu.org/onlinedocs/gcc/Common-Attributes.html#Common-Function-Attributes
---
> Check the result of every call that can fail, including `fclose` and `fwrite`, and mark your own failure-reporting functions `[[nodiscard]]`.

## Why

Standard I/O and memory functions report failure through their return value; a short write or a failed final flush means data was lost even though no other symptom appears. Discarding the result silently converts a detectable I/O error into apparent success. The `[[nodiscard]]` attribute makes that discard a compiler warning for APIs you define.

## Bad

```c
#include <stdio.h>

int save(FILE *f, const void *data, size_t n, int value) {
    fwrite(data, 1, n, f);        /* a short write is silently dropped */
    fprintf(f, "%d\n", value);    /* a failed flush is silently dropped */
    return 0;
}
```

## Good

```c
#include <stdio.h>

[[nodiscard]] int write_all(FILE *f, const void *data, size_t n) {
    return fwrite(data, 1, n, f) == n ? 0 : -1;
}

int save(FILE *f, const void *data, size_t n, int value) {
    if (write_all(f, data, n) != 0) {
        return -1;
    }
    return fprintf(f, "%d\n", value) >= 0 ? 0 : -1;
}
```

## See Also

- [c-err-status-return](err-status-return.md) - the return convention callers are expected to consume
- [c-err-sentinel-type](err-sentinel-type.md) - reading the sentinel correctly before deciding what happened
- [c-err-alloc-failure](err-alloc-failure.md) - the allocation half of unchecked results
