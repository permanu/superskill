---
id: c-api-validate-params
lang: c
prefix: api
title: Validate parameters in the callee before use
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [parameter validation, defensive programming, boundary]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-ptr-null-check, c-api-commit-rollback]
sources:
  - title: SEI CERT C - API00-C, functions should validate their parameters
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/application-programming-interfaces-api/api00-c/
---
> Let the function check what it is about to store or use; CERT recommends callee-side validation for safety.

## Why

CERT's API guidance notes that validation can sit on either side of an interface and recommends the callee for safety: one location, applied consistently, and the function survives improper use. A setter that stores an invalid pointer or descriptor corrupts the library's internal state and exposes it to the caller's bug. Validating on entry also makes the failure condition easier to diagnose.

## Bad

```c
#include <stdio.h>

static FILE *current;

void setfile(FILE *file) {
    current = file;   /* stored without checking it is usable */
}
```

## Good

```c
#include <stdio.h>

static FILE *current;

int setfile(FILE *file) {
    if (file == NULL || ferror(file) || feof(file)) {
        return -1;   /* the callee validates what it stores */
    }
    current = file;
    return 0;
}
```

## See Also

- [c-ptr-null-check](ptr-null-check.md) - the null case of parameter validation
- [c-api-commit-rollback](api-commit-rollback.md) - leaving state unchanged when validation fails
