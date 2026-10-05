---
id: c-num-math-errors
lang: c
prefix: num
title: Bounds-check math function inputs and detect domain and range errors
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [math.h, domain error, range error, errno, sqrt]
  files: ["**/*.c", "**/*.h"]
  symbols: [sqrt, log, pow, errno, EDOM, ERANGE]
related: [c-err-errno-zero-before, c-unsafe-float-int-cast]
sources:
  - title: SEI CERT C - FLP32-C, prevent or detect domain and range errors in math functions
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/floating-point-flp/flp32-c/
---
> Check the argument domain before math calls and test for domain, pole, and range errors after them.

## Why

Math functions report problems through return values that can be NaN or infinity rather than through a failure return; `sqrt(-1.0)` returns a NaN and `log(0.0)` returns negative infinity, and both can flow onward as if they were numbers. CERT asks for input bounds checks where the domain allows and error detection where it does not, because range errors depend on the implementation. A NaN or errno check turns the silent wrong answer into a handled one.

## Bad

```c
#include <math.h>

double root(double x) {
    return sqrt(x);   /* negative input: domain error, result NaN */
}
```

## Good

```c
#include <errno.h>
#include <math.h>

int root(double x, double *out) {
    errno = 0;
    double r = sqrt(x);
    if (errno == EDOM || isnan(r)) {
        return -1;   /* domain error detected explicitly */
    }
    *out = r;
    return 0;
}
```

## See Also

- [c-err-errno-zero-before](err-errno-zero-before.md) - clearing errno before the call
- [c-unsafe-float-int-cast](unsafe-float-int-cast.md) - what happens when the NaN reaches a cast
