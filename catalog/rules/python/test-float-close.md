---
id: python-test-float-close
lang: python
prefix: test
title: Compare floats with a tolerance instead of exact equality
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [float, assertAlmostEqual, isclose, tolerance]
  files: ["**/*.py"]
  symbols: [assertAlmostEqual, math.isclose]
related: [python-test-one-behavior]
sources:
  - title: unittest - assertAlmostEqual
    url: https://docs.python.org/3/library/unittest.html
---

> Compare floats with a tolerance, never exact equality.

## Why

Binary floating point cannot represent most decimal fractions exactly, so two computations that should agree can differ in the last bits. `assertAlmostEqual` compares with a rounded difference, and `math.isclose` takes explicit relative and absolute tolerances. Choosing the tolerance in the test documents how much error the contract accepts.

## Bad

```python
import unittest


class TestAverage(unittest.TestCase):
    def test_average(self) -> None:
        values = [0.1, 0.2, 0.3]
        self.assertEqual(sum(values) / 3, 0.2)
```

## Good

```python
import unittest


class TestAverage(unittest.TestCase):
    def test_average(self) -> None:
        values = [0.1, 0.2, 0.3]
        self.assertAlmostEqual(sum(values) / 3, 0.2, places=7)
```

## See Also

- [python-test-one-behavior](test-one-behavior.md) - keeping the tolerance assertion the single subject of the test
