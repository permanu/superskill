---
id: c-style-keyword-spacing
lang: c
prefix: style
title: Space keywords like statements and operators, not like functions
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [spacing, sizeof, keywords, formatting]
  files: ["**/*.c", "**/*.h"]
  symbols: [sizeof]
related: [c-style-line-length, c-style-pointer-star]
sources:
  - title: Linux kernel coding style - Spaces
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Put a space after `if`, `for`, `switch`, and friends, and none between `sizeof` and its operand.

## Why

Kernel style treats `sizeof`, `typeof`, and `alignof` like functions, so they hug their parentheses, while control keywords get a space before theirs. The spacing then signals what kind of construct is being read before the words are parsed. Consistency here is cheap and makes scans of unfamiliar code faster.

## Bad

```c
int size_of_int(void) {
    return (int) sizeof (int);   /* space between sizeof and its operand */
}
```

## Good

```c
int size_of_int(void) {
    return (int)sizeof(int);   /* sizeof looks like a function here */
}
```

## See Also

- [c-style-line-length](style-line-length.md) - the other rule about line layout
- [c-style-pointer-star](style-pointer-star.md) - spacing around declarators
