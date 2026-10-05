---
id: python-test-subtests-loop
lang: python
prefix: test
title: Run parameterized cases as subtests so every case is reported
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [subTest, parameterized, loop, report]
  files: ["**/*.py"]
  symbols: [subTest]
related: [python-test-skip-reason]
sources:
  - title: unittest - Distinguishing test iterations using subtests
    url: https://docs.python.org/3/library/unittest.html
---

> Use subTest for parameterized cases so one failure does not hide the rest.

## Why

Without `subTest`, the first failing case aborts the method, so later cases never run and the report shows one failure for a table of inputs. `subTest` records each iteration separately with its parameters, so a single run reports every failing case and identifies which inputs produced them. The loop stays one method without hiding coverage.

## Bad

```python
import unittest


class TestEven(unittest.TestCase):
    def test_even(self) -> None:
        for value in range(6):
            self.assertEqual(value % 2, 0)
```

## Good

```python
import unittest


class TestEven(unittest.TestCase):
    def test_even(self) -> None:
        for value in range(6):
            with self.subTest(value=value):
                self.assertEqual(value % 2, 0)
```

## See Also

- [python-test-skip-reason](test-skip-reason.md) - handling cases that cannot run at all
