---
id: python-test-async-isolated
lang: python
prefix: test
title: Test coroutines with IsolatedAsyncioTestCase
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [IsolatedAsyncioTestCase, async test, unittest]
  files: ["**/test_*.py", "**/*_test.py"]
  symbols: [unittest.IsolatedAsyncioTestCase]
related: [python-test-isolation, python-async-run-entry]
sources:
  - title: unittest - Unit testing framework
    url: https://docs.python.org/3/library/unittest.html
---

> Test coroutines with IsolatedAsyncioTestCase; it runs each async test in a new event loop.

## Why

The unittest docs state that IsolatedAsyncioTestCase provides an API similar to TestCase and also accepts coroutines as test functions, and that its run method sets up a new event loop for the test. Calling asyncio.run() inside a plain TestCase reimplements that per-test loop setup and cannot offer the asyncSetUp and asyncTearDown hooks. The dedicated class also keeps a leaked task from one test out of the next.

## Bad

```python
import asyncio
import unittest


async def worker() -> int:
    return 1


class TestWorker(unittest.TestCase):
    def test_run(self) -> None:
        self.assertEqual(asyncio.run(worker()), 1)
```

## Good

```python
import unittest


async def worker() -> int:
    return 1


class TestWorker(unittest.IsolatedAsyncioTestCase):
    async def test_run(self) -> None:
        self.assertEqual(await worker(), 1)
```

## See Also

- [python-test-isolation](test-isolation.md) - keeping tests independent of each other
- [python-async-run-entry](async-run-entry.md) - asyncio.run for program entry points
