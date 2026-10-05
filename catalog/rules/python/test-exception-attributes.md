---
id: python-test-exception-attributes
lang: python
prefix: test
title: Assert the caught exception attributes and not only its type
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assertRaises, exception, attributes, payload]
  files: ["**/*.py"]
  symbols: [assertRaises, exception]
related: [python-test-assert-raises-specific]
sources:
  - title: unittest - assertRaises context manager
    url: https://docs.python.org/3/library/unittest.html
---

> Assert the caught exception's attributes, not only its type.

## Why

The contract of a failure includes its data: which field was invalid, what limit was exceeded, which item was missing. `assertRaises` as a context manager exposes the instance through its `exception` attribute, so the test can check that payload. A type-only test passes when the code raises the right class for the wrong reason.

## Bad

```python
import unittest


def parse_range(raw: str) -> int:
    value = int(raw)
    if value > 10:
        raise ValueError("too large")
    return value


class TestParseRange(unittest.TestCase):
    def test_rejects_large(self) -> None:
        with self.assertRaises(ValueError):
            parse_range("11")
```

## Good

```python
import unittest


def parse_range(raw: str) -> int:
    value = int(raw)
    if value > 10:
        raise ValueError(f"too large: {value}")
    return value


class TestParseRange(unittest.TestCase):
    def test_rejects_large(self) -> None:
        with self.assertRaises(ValueError) as caught:
            parse_range("11")
        self.assertEqual(str(caught.exception), "too large: 11")
```

## See Also

- [python-test-assert-raises-specific](test-assert-raises-specific.md) - narrowing the expected type first
