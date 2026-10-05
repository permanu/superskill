---
id: c-anti-assignment-in-condition
lang: c
prefix: anti
title: Do not perform assignments in selection statements
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assignment, condition, if, typo, ==]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-anti-shadowing, c-proj-warning-level]
sources:
  - title: SEI CERT C - EXP45-C, do not perform assignments in selection statements
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/expressions-exp/exp45-c/
---
> Keep assignment out of `if`, loop, `?:`, and `&&`/`||` conditions; perform it first, then test.

## Why

`if (a = b)` is almost always a mistyped `==`, and the assignment then both changes state and decides the branch. CERT lists the selection contexts where the mistake is most costly and recommends separating the assignment from the test. An explicit statement makes the intent readable and leaves the condition purely a comparison.

## Bad

```c
int is_same(int a, int b) {
    if ((a = b)) {   /* assignment, not comparison */
        return 1;
    }
    return 0;
}
```

## Good

```c
int is_same(int a, int b) {
    if (a == b) {
        return 1;
    }
    return 0;
}
```

## See Also

- [c-anti-shadowing](anti-shadowing.md) - the other way a condition silently uses the wrong object
- [c-proj-warning-level](proj-warning-level.md) - why the warning this triggers must not be silenced
