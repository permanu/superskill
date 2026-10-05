---
id: cpp-test-failure-output
lang: cpp
prefix: test
title: Make failure output carry the values that failed
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [failure, message, diagnostics, assertion]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-test-data-driven, cpp-test-fixture-raii]
sources:
  - title: GoogleTest Primer
    url: https://google.github.io/googletest/primer.html
  - title: GoogleTest Assertions Reference
    url: https://google.github.io/googletest/reference/assertions.html
---
> Report actual and expected values on failure so the log explains the bug.

## Why

A failure that says only "assertion failed" forces a rerun under a debugger to learn what the values were. Frameworks exist to make this unnecessary: assertions print both operands, and matchers describe the expectation in words. When writing a check by hand, printing the expression, the expected value, and the actual value costs one line and turns the CI log into the diagnosis.

## Bad

```cpp
#include <cstdlib>

int add(int a, int b);

void test_add() {
    if (add(2, 2) != 4)
        std::abort(); // no expression, no values: nothing to diagnose
}
```

## Good

```cpp
#include <cstdlib>
#include <iostream>

int add(int a, int b);

void check_equal(int actual, int expected, const char* expression) {
    if (actual != expected) {
        std::cerr << expression << ": expected " << expected
                  << ", got " << actual << '\n';
        std::exit(1);
    }
}

void test_add() {
    check_equal(add(2, 2), 4, "add(2, 2)");
}
```

## See Also

- [cpp-test-data-driven](test-data-driven.md) - values from a table need the same reporting
- [cpp-test-fixture-raii](test-fixture-raii.md) - keeping the failure path clean
