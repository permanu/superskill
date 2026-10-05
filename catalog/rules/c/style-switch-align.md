---
id: c-style-switch-align
lang: c
prefix: style
title: Align case labels with the switch keyword
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [switch, case, indentation, alignment]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-style-brace-placement, c-style-one-statement-per-line]
sources:
  - title: Linux kernel coding style - Indentation
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Put `case` in the same column as `switch`, with the case bodies indented one level.

## Why

Kernel style aligns `switch` and its `case` labels in the same column instead of double-indenting the labels. The labels are not nested statements; keeping them at the switch's level makes the branch list visible at a glance and leaves the indentation for the bodies. It also keeps deeply nested switches from drifting right.

## Bad

```c
int kind_of(int value) {
    switch (value) {
        case 0:
            return 0;
        default:
            return 1;
    }
}
```

## Good

```c
int kind_of(int value) {
    switch (value) {
    case 0:
        return 0;
    default:
        return 1;
    }
}
```

## See Also

- [c-style-brace-placement](style-brace-placement.md) - the braces around the switch body
- [c-style-one-statement-per-line](style-one-statement-per-line.md) - what each case body contains
