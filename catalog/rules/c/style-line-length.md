---
id: c-style-line-length
lang: c
prefix: style
title: Keep lines within the project's column limit and break them sensibly
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [line length, wrapping, columns, readability]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-style-one-statement-per-line, c-style-keyword-spacing]
sources:
  - title: Linux kernel coding style - Breaking long lines and strings
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Break lines at the project limit, preferably at the function parenthesis, and never break user-visible strings.

## Why

Kernel style sets the preferred limit at 80 columns and asks statements to be split into sensible chunks rather than left long. Long lines force horizontal scrolling, hide the end of the expression, and complicate side-by-side review. User-visible strings are the exception, because breaking them breaks the ability to grep for the message.

## Bad

```c
int compute_total(int first, int second, int third, int fourth) { return first + second + third + fourth; }
```

## Good

```c
int compute_total(int first, int second, int third, int fourth) {
    return first + second + third + fourth;
}
```

## See Also

- [c-style-one-statement-per-line](style-one-statement-per-line.md) - reducing what each line carries
- [c-style-keyword-spacing](style-keyword-spacing.md) - spacing that keeps lines readable
