---
id: c-style-one-statement-per-line
lang: c
prefix: style
title: Put one statement and one assignment per line
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [statements, assignments, lines, readability]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-style-line-length, c-style-brace-placement]
sources:
  - title: Linux kernel coding style - Indentation
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Do not pack multiple statements or multiple assignments onto a single line.

## Why

Kernel style asks for one statement per line and one assignment per line, because compressed lines hide side effects and make diffs touch more than the change they describe. A condition and its update on one line must be parsed as a unit, and a debugger breakpoint cannot land between them. One action per line keeps each step visible.

## Bad

```c
int clamp(int value) {
    int low = 0, high = 100; value = value < low ? low : value;
    return value > high ? high : value;
}
```

## Good

```c
int clamp(int value) {
    int low = 0;
    int high = 100;
    if (value < low) {
        value = low;
    }
    return value > high ? high : value;
}
```

## See Also

- [c-style-line-length](style-line-length.md) - the other limit on line content
- [c-style-brace-placement](style-brace-placement.md) - the block shape these statements live in
