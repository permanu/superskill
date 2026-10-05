---
id: c-macro-constant-parens
lang: c
prefix: macro
title: Parenthesize macro bodies that contain expressions
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macro, parentheses, precedence, constants]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-macro-param-parens, c-pat-array-size]
sources:
  - title: Linux kernel coding style - Macros, Enums and RTL
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Wrap every macro body that is an expression in parentheses, including parameter uses.

## Why

A macro body is substituted textually, so an unparenthesized expression joins the surrounding expression with its own precedence. Kernel style requires constant macros that use expressions to be fully parenthesized and warns that parameter uses have the same problem. The parentheses cost nothing and remove the class of bug entirely.

## Bad

```c
#define MASK 0x0F + 1

int scaled(int value) {
    return value * MASK;   /* expands to value * 0x0F + 1 */
}
```

## Good

```c
#define MASK (0x0F + 1)

int scaled(int value) {
    return value * MASK;
}
```

## See Also

- [c-macro-param-parens](macro-param-parens.md) - the parameter half of the same rule
- [c-pat-array-size](pat-array-size.md) - a macro body that applies this
