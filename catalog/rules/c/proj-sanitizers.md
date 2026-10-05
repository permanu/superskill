---
id: c-proj-sanitizers
lang: c
prefix: proj
title: Run the test suite under the undefined-behavior and address sanitizers
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sanitizer, UBSan, ASan, CI, undefined behavior]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-static-analysis, c-proj-fuzzing]
sources:
  - title: Clang - UndefinedBehaviorSanitizer
    url: https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html
---
> Build and run tests under `-fsanitize=undefined,address` so latent UB and memory errors surface.

## Why

Undefined behavior and out-of-bounds access can be invisible in ordinary builds: the wrong value happens to be harmless today and becomes a crash or exploit under a different compiler or input. The sanitizers insert checks for exactly these conditions and report each violation with a diagnostic and a stack trace at the point it occurs. UBSan recovers by default and continues, so pass `-fno-sanitize-recover=all` to turn findings into a failing exit status. A test suite that passes under sanitizers is evidence the code avoids the trap; one that is never run under them is not.

## Bad

```c
int sum_range(const int *values, int n) {
    int total = 0;
    for (int i = 0; i <= n; ++i) {   /* off-by-one: reads one past the end */
        total += values[i];
    }
    return total;
}
```

## Good

```c
int sum_range(const int *values, int n) {
    int total = 0;
    for (int i = 0; i < n; ++i) {
        total += values[i];
    }
    return total;
}
```

## See Also

- [c-proj-static-analysis](proj-static-analysis.md) - catching the same class of bug before the run
- [c-proj-fuzzing](proj-fuzzing.md) - generating the inputs that reach these paths
