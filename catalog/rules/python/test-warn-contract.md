---
id: python-test-warn-contract
lang: python
prefix: test
title: Assert warning contracts with assertWarns instead of reading stderr
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assertWarns, warnings, deprecation, contract]
  files: ["**/*.py"]
  symbols: [assertWarns, assertWarnsRegex]
related: [python-test-log-contract]
sources:
  - title: unittest - assertWarns
    url: https://docs.python.org/3/library/unittest.html
  - title: warnings - Warning control
    url: https://docs.python.org/3/library/warnings.html
---

> Assert warning contracts with assertWarns; capture the category and message in the test.

## Why

Warnings are part of an API contract: deprecations, ignored fallbacks, and suspicious values. `assertWarns` and `assertWarnsRegex` verify the category and message regardless of the filters in effect when the test runs. Reading stderr or relying on default filters couples the test to process configuration and breaks under different warning flags.

## Bad

```python
import unittest
import warnings


def connect(legacy: bool) -> None:
    if legacy:
        warnings.warn("legacy mode", DeprecationWarning, stacklevel=2)


class TestConnect(unittest.TestCase):
    def test_legacy_warns(self) -> None:
        with warnings.catch_warnings(record=True) as caught:
            connect(True)
        self.assertEqual(len(caught), 1)
```

## Good

```python
import unittest
import warnings


def connect(legacy: bool) -> None:
    if legacy:
        warnings.warn("legacy mode", DeprecationWarning, stacklevel=2)


class TestConnect(unittest.TestCase):
    def test_legacy_warns(self) -> None:
        with self.assertWarnsRegex(DeprecationWarning, "legacy mode"):
            connect(True)
```

## See Also

- [python-test-log-contract](test-log-contract.md) - the same contract-testing approach for log output
