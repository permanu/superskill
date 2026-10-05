---
id: c-num-float-loop-counter
lang: c
prefix: num
title: Never use a floating-point value as a loop counter
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [loop counter, float, rounding, iteration]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-num-float-literals, c-num-nan-compare]
sources:
  - title: SEI CERT C - FLP30-C, do not use floating-point variables as loop counters
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/floating-point-flp/flp30-c/
---
> Count iterations with an integer and derive the floating-point value inside the loop.

## Why

Binary floating-point cannot represent most decimal fractions exactly, so `x += 0.1` accumulates rounding error and the loop may run one iteration more or less than intended; adding a step smaller than the current precision can fail to change the counter at all and loop forever. CERT requires an integer induction variable with the floating-point value computed from it. The iteration count then matches the intent exactly.

## Bad

```c
double sum_steps(void) {
    double total = 0.0;
    for (double x = 0.0; x != 1.0; x += 0.1) {   /* never exactly 1.0 */
        total += x;
    }
    return total;
}
```

## Good

```c
double sum_steps(int steps) {
    double total = 0.0;
    for (int i = 0; i < steps; ++i) {   /* integer counter */
        total += (double)i / 10.0;
    }
    return total;
}
```

## See Also

- [c-num-float-literals](num-float-literals.md) - keeping the derived arithmetic in the right type
- [c-num-nan-compare](num-nan-compare.md) - the comparison that also breaks loops
