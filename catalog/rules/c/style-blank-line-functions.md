---
id: c-style-blank-line-functions
lang: c
prefix: style
title: Separate function definitions with a single blank line
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [blank line, functions, separation, layout]
  files: ["**/*.c"]
  symbols: []
related: [c-style-comment-blocks, c-proj-format]
sources:
  - title: Linux kernel coding style - Functions
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Leave exactly one blank line between function definitions.

## Why

Kernel style asks for one blank line between functions so the eye finds each definition's start, and no more so the file does not scroll away. Back-to-back definitions read as one block, and multiple blank lines waste screen space without adding structure. The separation is part of how the file communicates its units.

## Bad

```c
int first(void) {
    return 1;
}
int second(void) {
    return 2;
}
```

## Good

```c
int first(void) {
    return 1;
}

int second(void) {
    return 2;
}
```

## See Also

- [c-style-comment-blocks](style-comment-blocks.md) - the comment that heads each function
- [c-proj-format](proj-format.md) - letting the formatter keep the spacing
