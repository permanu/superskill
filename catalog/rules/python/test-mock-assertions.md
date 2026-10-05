---
id: python-test-mock-assertions
lang: python
prefix: test
title: Assert mock calls with the built-in assert helpers
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Mock, assert_called_once_with, call_args, assertions]
  files: ["**/test_*.py", "**/*_test.py"]
  symbols: [unittest.mock.Mock.assert_called_once_with]
related: [python-test-mock-autospec, python-test-mock-where-looked-up]
sources:
  - title: unittest.mock - mock object library
    url: https://docs.python.org/3/library/unittest.mock.html
---

> Assert mock calls with assert_called_once_with; hand-read call_args misses the diagnostics.

## Why

The unittest.mock docs define assert_called_once_with as asserting that the mock was called exactly once and that the call was with the specified arguments, and the same family includes assert_called_with and assert_any_call. Reading call_count and call_args by hand loses the failure message that names the actual calls, which is most of the debugging value. The helpers also read as the behavior under test.

## Bad

```python
from unittest.mock import Mock


def test_called() -> None:
    callback = Mock()
    callback("ready")
    assert callback.call_count == 1
    assert callback.call_args[0] == ("ready",)
```

## Good

```python
from unittest.mock import Mock


def test_called() -> None:
    callback = Mock()
    callback("ready")
    callback.assert_called_once_with("ready")
```

## See Also

- [python-test-mock-autospec](test-mock-autospec.md) - constraining the mock's interface
- [python-test-mock-where-looked-up](test-mock-where-looked-up.md) - patching where the name is looked up
