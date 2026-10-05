---
id: c-test-coverage
lang: c
prefix: test
title: Give each case its own branch, or enable MC/DC, when every sub-condition must be tested
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [coverage, branch, short-circuit, tests]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-test-tsan-threaded, c-lint-clang-tidy]
sources:
  - title: Clang - Source-based Code Coverage
    url: https://clang.llvm.org/docs/SourceBasedCodeCoverage.html
---
> Give each case its own branch, or enable MC/DC, when every sub-condition must be tested.

## Why

Clang's source-based coverage documents MC/DC as the percentage of individual branch conditions shown to independently affect the decision outcome, built on top of branch coverage and accounting for short-circuit evaluation. Ordinary branch coverage alone does not establish that each sub-condition of a compound decision was tested; the MC/DC view is produced only with `-fcoverage-mcdc` instrumentation. Either enable that instrumentation and vary one condition at a time, or split the decision so each case is its own branch.

## Bad

```c
int decide(int value) {
    if (value > 100 || value == 50) {   /* one decision, two conditions to prove */
        return 2;
    }
    return 0;
}
```

## Good

```c
int decide(int value) {
    if (value > 100) {
        return 2;
    }
    if (value == 50) {
        return 2;   /* its own decision, testable on its own */
    }
    return 0;
}
```

## See Also

- [c-test-tsan-threaded](test-tsan-threaded.md) - the other CI instrumentation for tests
- [c-lint-clang-tidy](lint-clang-tidy.md) - static checks that run alongside coverage
