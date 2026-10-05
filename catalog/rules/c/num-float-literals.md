---
id: c-num-float-literals
lang: c
prefix: num
title: Suffix float literals so arithmetic stays in the intended type
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [float literal, suffix, double, precision]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-num-float-loop-counter, c-conv-float-narrowing]
sources:
  - title: cppreference - Floating constant
    url: https://en.cppreference.com/w/c/language/floating_constant
---
> Write `1.5f` when the value and the arithmetic should be float.

## Why

An unsuffixed floating constant has type `double`, so `float x = 1.5 * y;` computes in double and narrows on assignment, which costs precision and performance and can change rounding compared with float arithmetic. The `f` suffix makes the constant and therefore the expression float. Choosing the suffix is choosing the arithmetic type, not just a storage size.

## Bad

```c
float scale(float value) {
    return value * 1.5;   /* double arithmetic, then narrowing */
}
```

## Good

```c
float scale(float value) {
    return value * 1.5f;   /* the constant and the arithmetic stay float */
}
```

## See Also

- [c-num-float-loop-counter](num-float-loop-counter.md) - where derived values should stay in type
- [c-conv-float-narrowing](conv-float-narrowing.md) - checking a narrowing that is intended
