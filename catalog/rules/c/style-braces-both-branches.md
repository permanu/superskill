---
id: c-style-braces-both-branches
lang: c
prefix: style
title: Use braces on both branches when either branch needs them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [braces, if else, dangling else, readability]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-style-brace-placement, c-anti-deep-nesting]
sources:
  - title: Linux kernel coding style - Placing Braces and Spaces
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Brace both sides of an if/else as soon as one side has more than a single statement.

## Why

A braced branch next to an unbraced one reads as if the braces were optional and invites a later edit to add a second statement to the unbraced side, which silently changes what the branch covers. Kernel style keeps single-statement branches bare only when both sides are single statements. Symmetric braces make the two cases visually parallel.

## Bad

```c
int sign(int value) {
    if (value > 0)
        return 1;
    else {
        return -1;
    }
}
```

## Good

```c
int sign(int value) {
    if (value > 0) {
        return 1;
    } else {
        return -1;
    }
}
```

## See Also

- [c-style-brace-placement](style-brace-placement.md) - where the braces sit
- [c-anti-deep-nesting](anti-deep-nesting.md) - flattening instead of growing branches
