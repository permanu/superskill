---
id: c-macro-single-eval
lang: c
prefix: macro
title: Never pass side-effecting arguments to an unsafe macro
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macro, side effects, double evaluation, increment]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-anti-function-macro, c-macro-param-parens]
sources:
  - title: SEI CERT C - PRE31-C, avoid side effects in arguments to unsafe macros
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/preprocessor-pre/pre31-c/
---
> Evaluate the side effect in its own statement before calling the macro.

## Why

An unsafe function-like macro is one whose expansion evaluates a parameter more than once or not at all, so an argument with a side effect runs a different number of times than written; CERT's `ABS(++n)` increments twice. The responsibility is on the caller even when the macro is documented as unsafe. Perform the update first and pass the resulting value.

## Bad

```c
#define ABS(x) (((x) < 0) ? -(x) : (x))

int distance(int *value) {
    return ABS((*value)++);   /* the increment may run twice */
}
```

## Good

```c
int distance(int *value) {
    int current = *value;
    ++*value;
    return current < 0 ? -current : current;   /* evaluated once, explicitly */
}
```

## See Also

- [c-anti-function-macro](anti-function-macro.md) - avoiding unsafe macros altogether
- [c-macro-param-parens](macro-param-parens.md) - the other argument-substitution hazard
