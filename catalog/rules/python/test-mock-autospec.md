---
id: python-test-mock-autospec
lang: python
prefix: test
title: Build mocks with autospec so they enforce the real signature
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [autospec, create_autospec, mock, signature]
  files: ["**/*.py"]
  symbols: [create_autospec, autospec]
related: [python-test-mock-where-looked-up]
sources:
  - title: unittest.mock - Autospeccing and create_autospec
    url: https://docs.python.org/3/library/unittest.mock.html
---

> Use create_autospec or autospec so mocks reject calls the real API rejects.

## Why

A plain `Mock` accepts any call, so a test can pass while the same call would raise `TypeError` against the real function. Autospeccing copies the signature of the replaced callable, and the mock fails on wrong arity or unknown arguments the same way production would. It also restricts attribute access to what the real object exposes.

## Bad

```python
import unittest
from unittest import mock


class TestNotifier(unittest.TestCase):
    def test_send(self) -> None:
        notifier = mock.Mock()
        notifier.send("alice", "hi", 3)
        notifier.send.assert_called_once_with("alice", "hi", 3)
```

## Good

```python
import unittest
from unittest import mock


def send(recipient: str, message: str) -> None:
    pass


class TestNotifier(unittest.TestCase):
    def test_send(self) -> None:
        notifier = mock.create_autospec(send)
        notifier("alice", "hi")
        notifier.assert_called_once_with("alice", "hi")
```

## See Also

- [python-test-mock-where-looked-up](test-mock-where-looked-up.md) - making sure the autospecced mock is actually used
