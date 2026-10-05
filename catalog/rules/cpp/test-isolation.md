---
id: cpp-test-isolation
lang: cpp
prefix: test
title: "Keep tests independent: each test builds its own state and passes in any order"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [isolation, order, shared-state, repeatable]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-test-fixture-raii, cpp-test-temp-raii]
sources:
  - title: GoogleTest Primer
    url: https://google.github.io/googletest/primer.html
  - title: GoogleTest Advanced Topics
    url: https://google.github.io/googletest/advanced.html
---
> Tests own their state and pass alone, in any order, and repeatedly.

## Why

A test that mutates shared state makes its result depend on which tests ran before it, so failures stop being reproducible and debugging means bisecting execution order. Test frameworks isolate each test for this reason and do not define execution order. Building state inside each test, or in a per-test fixture, makes every test meaningful on its own and lets the suite be reordered, filtered, and parallelized.

## Bad

```cpp
#include <vector>

std::vector<int> shared; // mutated by every test

void test_first() {
    shared.push_back(1);
}

void test_second() {
    shared.push_back(2);
    // result depends on whether test_first ran before
}
```

## Good

```cpp
#include <vector>

void test_first() {
    std::vector<int> values; // each test owns its state
    values.push_back(1);
}

void test_second() {
    std::vector<int> values;
    values.push_back(2); // order-independent and repeatable
}
```

## See Also

- [cpp-test-fixture-raii](test-fixture-raii.md) - per-test setup objects that keep state local
- [cpp-test-temp-raii](test-temp-raii.md) - isolation from the filesystem
