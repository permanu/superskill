---
id: python-test-isolation
lang: python
prefix: test
title: Keep each test self-contained and independent of execution order
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [isolation, shared state, order, setUp]
  files: ["**/*.py"]
  symbols: [setUp, TestCase]
related: [python-test-addcleanup]
sources:
  - title: unittest - Organizing test code
    url: https://docs.python.org/3/library/unittest.html
---

> Keep tests independent: no shared mutable state and no reliance on order.

## Why

unittest builds a fresh TestCase instance per test and documents that each test should run in isolation or in arbitrary combination. Module-level state mutated by one test makes failures depend on execution order and disappear when a single test is run alone. Build fixtures in setUp or inside the test so every test starts from the same known state.

## Bad

```python
import unittest

CACHE: dict[str, int] = {}


class TestCounter(unittest.TestCase):
    def test_first(self) -> None:
        CACHE["hits"] = 1
        self.assertEqual(CACHE["hits"], 1)

    def test_second(self) -> None:
        self.assertEqual(CACHE["hits"], 1)
```

## Good

```python
import unittest


class TestCounter(unittest.TestCase):
    def setUp(self) -> None:
        self.cache: dict[str, int] = {}

    def test_first_hit(self) -> None:
        self.cache["hits"] = 1
        self.assertEqual(self.cache["hits"], 1)

    def test_empty_cache(self) -> None:
        self.assertEqual(self.cache, {})
```

## See Also

- [python-test-addcleanup](test-addcleanup.md) - releasing fixtures without leaving state behind
