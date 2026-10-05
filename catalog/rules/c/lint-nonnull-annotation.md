---
id: c-lint-nonnull-annotation
lang: c
prefix: lint
title: Annotate non-null pointer parameters for the analyzers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nonnull, attribute, analyzer, contract]
  files: ["**/*.h"]
  symbols: []
related: [c-lint-clang-tidy, c-ptr-null-check]
sources:
  - title: GCC - Common Attributes (nonnull)
    url: https://gcc.gnu.org/onlinedocs/gcc/Common-Attributes.html#Common-Function-Attributes
---
> Put `nonnull` on parameters the function cannot accept as null so analyzers can check callers.

## Why

The attribute documentation describes `nonnull` as promising that the listed arguments are non-null, which lets the compiler and analyzers warn at call sites that pass null and optimize based on the contract. Without the annotation, every call is a maybe, and the analyzer cannot report the mistake. The attribute is also documentation of the API's precondition.

## Bad

```c
#include <stddef.h>

size_t span_len(const char *data, size_t len);   /* can data be NULL? */
```

## Good

```c
#include <stddef.h>

size_t span_len(const char *data, size_t len)
    __attribute__((nonnull(1)));   /* the analyzer checks call sites */
```

## See Also

- [c-lint-clang-tidy](lint-clang-tidy.md) - the checks that consume the annotation
- [c-ptr-null-check](ptr-null-check.md) - the runtime check inside the function
