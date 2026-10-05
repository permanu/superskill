---
id: python-test-skip-reason
lang: python
prefix: test
title: Skip with skipIf or skipUnless and a reason instead of returning early
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [skip, skipIf, skipUnless, platform]
  files: ["**/*.py"]
  symbols: [unittest.skipUnless, unittest.skipIf]
related: [python-test-subtests-loop]
sources:
  - title: unittest - Skipping tests and expected failures
    url: https://docs.python.org/3/library/unittest.html
---

> Skip with skipIf or skipUnless and a reason; silently returning hides the gap.

## Why

A skip decorator keeps the test visible in the report with its reason and condition, and re-enables it automatically when the condition clears. A test that returns early when the platform does not match reports as a pass, so the missing coverage is invisible. The reason string is what tells the next reader why the case is not running.

## Bad

```python
import sys
import unittest


class TestWindowsOnly(unittest.TestCase):
    def test_registry(self) -> None:
        if not sys.platform.startswith("win"):
            return
        raise AssertionError("registry read failed")
```

## Good

```python
import sys
import unittest


class TestWindowsOnly(unittest.TestCase):
    @unittest.skipUnless(sys.platform.startswith("win"), "requires Windows")
    def test_registry(self) -> None:
        raise AssertionError("registry read failed")
```

## See Also

- [python-test-subtests-loop](test-subtests-loop.md) - reporting partial coverage inside a single method
