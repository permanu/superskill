---
id: c-lint-suppression-scope
lang: c
prefix: lint
title: Scope warning suppressions narrowly and save the state
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pragma, suppression, push, pop, warnings]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-warning-level, c-lint-opt-in-warnings]
sources:
  - title: SEI CERT C - MSC00-C, compile cleanly at high warning levels
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/miscellaneous-msc/msc00-c/
---
> Push the diagnostic state, suppress around the single construct, and pop.

## Why

CERT's warning guidance shows the push/pop pattern for pragma-based suppression and warns against resetting warnings to defaults, which restores a different state than the one that was in effect. A file-wide suppression silently covers every later line, including new code. Saving and restoring the state keeps the exception exactly as wide as the construct that needs it.

## Bad

```c
#pragma clang diagnostic ignored "-Wconversion"   /* disabled for the rest of the file */

int narrow(long value) {
    return (int)value;
}
```

## Good

```c
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wconversion"   /* scoped to one function */
int narrow(long value) {
    return (int)value;
}
#pragma clang diagnostic pop
```

## See Also

- [c-proj-warning-level](proj-warning-level.md) - why suppression is the exception, not the fix
- [c-lint-opt-in-warnings](lint-opt-in-warnings.md) - the flags that get suppressed
