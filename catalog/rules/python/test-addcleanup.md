---
id: python-test-addcleanup
lang: python
prefix: test
title: Register cleanup with addCleanup because tearDown does not run when setUp fails
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [addCleanup, setUp, tearDown, fixtures]
  files: ["**/*.py"]
  symbols: [addCleanup, enterContext]
related: [python-test-isolation]
sources:
  - title: unittest - addCleanup
    url: https://docs.python.org/3/library/unittest.html
---

> Register cleanup with addCleanup; tearDown does not run when setUp fails.

## Why

unittest calls `tearDown` only when `setUp` succeeded, so a fixture that fails halfway leaves whatever it acquired behind. Cleanup functions registered with `addCleanup` still run in that case, in reverse registration order. Registering each resource as it is acquired keeps partial fixtures from leaking between tests.

## Bad

```python
import unittest


class TestSession(unittest.TestCase):
    def setUp(self) -> None:
        self.events: list[str] = []
        self.events.append("connected")
        raise RuntimeError("handshake failed")

    def tearDown(self) -> None:
        self.events.clear()
```

## Good

```python
import unittest


class TestSession(unittest.TestCase):
    def setUp(self) -> None:
        self.events: list[str] = []
        self.addCleanup(self.events.clear)
        self.events.append("connected")
        raise RuntimeError("handshake failed")
```

## See Also

- [python-test-isolation](test-isolation.md) - the fixture lifecycle that makes tests order-independent
