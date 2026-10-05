---
id: python-test-assert-raises-specific
lang: python
prefix: test
title: Assert the exact exception type instead of a blind Exception
severity: should
enforce: tool
tool: ruff:B017
baseline: latest
status: verified
triggers:
  keywords: [assertRaises, exception, blind, B017]
  files: ["**/*.py"]
  symbols: [assertRaises]
related: [python-test-exception-attributes]
sources:
  - title: unittest - assertRaises
    url: https://docs.python.org/3/library/unittest.html
  - title: Ruff B017 - assert-raises-exception
    url: https://docs.astral.sh/ruff/rules/assert-raises-exception/
---

> Assert the exact exception type; a blind Exception assertion passes for the wrong failure.

## Why

`assertRaises(Exception)` accepts any error, including a syntax error or a bug in the test itself, so the test passes when the intended validation never ran. Naming the expected type makes the assertion prove the contract; add `assertRaisesRegex` when the message is also part of it. Ruff flags blind assertions by default.

## Bad

```python
import unittest


def parse_port(raw: str) -> int:
    return int(raw)


class TestParsePort(unittest.TestCase):
    def test_rejects_bad_input(self) -> None:
        with self.assertRaises(Exception):
            parse_port("http")
```

## Good

```python
import unittest


def parse_port(raw: str) -> int:
    return int(raw)


class TestParsePort(unittest.TestCase):
    def test_rejects_bad_input(self) -> None:
        with self.assertRaises(ValueError):
            parse_port("http")
```

## See Also

- [python-test-exception-attributes](test-exception-attributes.md) - checking the failure payload beyond its type
