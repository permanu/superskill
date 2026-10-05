---
id: c-unsafe-eval-order
lang: c
prefix: unsafe
title: Give each modification of a scalar its own statement
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sequence point, unsequenced, increment, side effect]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-unsafe-va-arg]
sources:
  - title: cppreference - Evaluation order and sequence points
    url: https://en.cppreference.com/w/c/language/eval_order
---
> Do not modify the same scalar object twice, or modify and read it, inside one unsequenced expression.

## Why

When two side effects on the same scalar are unsequenced, or a side effect is unsequenced with a value computation of that object, the behavior is undefined; `i = i++ + 1` and `f(i++, i++)` are the canonical examples. Splitting the operations into separate full expressions gives each modification a defined order and makes the result readable without reasoning about sequencing rules.

## Bad

```c
int next_pair(int i) {
    int a[2] = {0, 0};
    return (a[i] = 1) + (a[i] = 2);   /* same object modified twice, unsequenced */
}
```

## Good

```c
int next_pair(int i) {
    int a[2] = {0, 0};
    a[i] = 1;
    int first = a[i];
    a[i] = 2;
    return first + a[i];   /* reads and writes now have an order */
}
```

## See Also

- [c-unsafe-va-arg](unsafe-va-arg.md) - argument evaluation rules at variadic calls
