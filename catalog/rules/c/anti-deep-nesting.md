---
id: c-anti-deep-nesting
lang: c
prefix: anti
title: Flatten deep nesting with guard clauses
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nesting, guard clause, indentation, early return]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-anti-long-function, c-anti-goto-control-flow]
sources:
  - title: Linux kernel coding style - Indentation
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Reject invalid cases at the top of the function and keep the remaining body at one level.

## Why

Kernel style observes that more than three levels of indentation means the function needs restructuring: each nested block multiplies the conditions a reader must hold, and the actual work ends up buried at the deepest level. Guard clauses that return early for the rejected cases invert the nesting so the main path stays flat and visible.

## Bad

```c
int classify(int value) {
    int result = 0;
    if (value > 0) {
        if (value < 100) {
            if (value != 50) {
                result = 1;
            }
        }
    }
    return result;
}
```

## Good

```c
int classify(int value) {
    if (value <= 0 || value >= 100 || value == 50) {
        return 0;   /* rejected cases leave early */
    }
    return 1;
}
```

## See Also

- [c-anti-long-function](anti-long-function.md) - splitting what flattening cannot fix
- [c-anti-goto-control-flow](anti-goto-control-flow.md) - control flow that stays structured
