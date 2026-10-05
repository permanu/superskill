---
id: python-test-mock-where-looked-up
lang: python
prefix: test
title: Patch a name where it is looked up, not where it is defined
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [patch, mock, where to patch, import]
  files: ["**/*.py"]
  symbols: [mock.patch]
related: [python-test-mock-autospec]
sources:
  - title: unittest.mock - Where to patch
    url: https://docs.python.org/3/library/unittest.mock.html
---

> Patch a name where it is looked up, not where it is defined.

## Why

When a module imports a name with `from x import y`, the module holds its own reference to the object, and the defining module is no longer consulted at call time. Patching the defining location leaves the code under test calling the real function, so the test passes for the wrong reason. Patch the attribute on the module that uses it.

## Bad

```python
import unittest
from unittest import mock

from time import time


def elapsed(start: float) -> float:
    return time() - start


class TestElapsed(unittest.TestCase):
    def test_zero(self) -> None:
        with mock.patch("time.time", return_value=5.0):
            self.assertEqual(elapsed(5.0), 0.0)
```

## Good

```python
import unittest
from unittest import mock

from time import time


def elapsed(start: float) -> float:
    return time() - start


class TestElapsed(unittest.TestCase):
    def test_zero(self) -> None:
        with mock.patch(f"{__name__}.time", return_value=5.0):
            self.assertEqual(elapsed(5.0), 0.0)
```

## See Also

- [python-test-mock-autospec](test-mock-autospec.md) - shaping the replacement to the real signature
