---
id: python-test-log-contract
lang: python
prefix: test
title: Assert log contracts with assertLogs instead of capturing stderr
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assertLogs, logging, audit, contract]
  files: ["**/*.py"]
  symbols: [assertLogs, logging]
related: [python-test-warn-contract]
sources:
  - title: unittest - assertLogs
    url: https://docs.python.org/3/library/unittest.html
  - title: logging - Logging facility
    url: https://docs.python.org/3/library/logging.html
---

> Assert log contracts with assertLogs; it checks logger, level, and records.

## Why

Log output is part of the observable behavior of audits, retries, and incident trails. `assertLogs` captures records from a named logger at or above a level and fails when nothing is emitted, without touching handlers, streams, or global configuration. Redirecting stderr to inspect text couples the test to formatting.

## Bad

```python
import logging
import unittest

logger = logging.getLogger("app.audit")


def record_login(user: str) -> None:
    logger.info("login user=%s", user)


class TestAudit(unittest.TestCase):
    def test_login_logged(self) -> None:
        record_login("alice")
```

## Good

```python
import logging
import unittest

logger = logging.getLogger("app.audit")


def record_login(user: str) -> None:
    logger.info("login user=%s", user)


class TestAudit(unittest.TestCase):
    def test_login_logged(self) -> None:
        with self.assertLogs("app.audit", level="INFO") as captured:
            record_login("alice")
        self.assertIn("login user=alice", captured.output[0])
```

## See Also

- [python-test-warn-contract](test-warn-contract.md) - the same contract-testing approach for warnings
