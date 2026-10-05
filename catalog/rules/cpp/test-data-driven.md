---
id: cpp-test-data-driven
lang: cpp
prefix: test
title: Drive repeated checks from a table of cases instead of copy-pasted tests
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [table, cases, parameterized, data-driven]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-test-failure-output, cpp-test-error-paths]
sources:
  - title: GoogleTest Advanced Topics
    url: https://google.github.io/googletest/advanced.html
---
> Put input/expected pairs in one table and loop, rather than duplicating the same check.

## Why

Copy-pasted tests for different inputs drift: one copy gets an extra assertion, another misses an edge case, and adding a case means writing another function. A table of inputs and expected values keeps the check written once, makes the covered cases visible as data, and adding a case is one line. Parameterized-test support in frameworks exists for exactly this reason.

## Bad

```cpp
#include <cstdlib>

int clamp(int value, int low, int high);

void test_clamp_below() {
    if (clamp(-5, 0, 10) != 0) std::abort();
}

void test_clamp_inside() {
    if (clamp(5, 0, 10) != 5) std::abort();
}

void test_clamp_above() {
    if (clamp(15, 0, 10) != 10) std::abort();
}
```

## Good

```cpp
#include <cstdlib>

int clamp(int value, int low, int high);

struct Case {
    int value;
    int expected;
};

void test_clamp() {
    const Case cases[] = {
        {-5, 0}, {0, 0}, {5, 5}, {10, 10}, {15, 10},
    };
    for (const Case& c : cases)
        if (clamp(c.value, 0, 10) != c.expected)
            std::abort();
}
```

## See Also

- [cpp-test-failure-output](test-failure-output.md) - naming the failing case in the output
- [cpp-test-error-paths](test-error-paths.md) - the same table technique for failures
