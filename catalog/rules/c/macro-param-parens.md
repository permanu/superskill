---
id: c-macro-param-parens
lang: c
prefix: macro
title: Parenthesize every parameter use in a macro body
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macro, parameters, parentheses, precedence]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-macro-constant-parens, c-macro-single-eval]
sources:
  - title: Linux kernel coding style - Macros, Enums and RTL
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Write `((x) * 2)`, not `x * 2`; the argument is substituted, not passed.

## Why

A macro parameter is replaced by the caller's tokens before the expression is parsed, so an argument like `v + 1` combines with the macro's operators according to the surrounding precedence. Kernel style calls out exactly this pitfall when it asks for parentheses around parameters. Parenthesizing each use makes the macro behave like the function it imitates.

## Bad

```c
#define SCALE(x) x * 2

int f(int v) {
    return SCALE(v + 1);   /* expands to v + 1 * 2 */
}
```

## Good

```c
#define SCALE(x) ((x) * 2)

int f(int v) {
    return SCALE(v + 1);
}
```

## See Also

- [c-macro-constant-parens](macro-constant-parens.md) - the body half of the same rule
- [c-macro-single-eval](macro-single-eval.md) - the other macro-argument hazard
