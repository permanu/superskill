---
id: python-err-chain-suppress
lang: python
prefix: err
title: Use raise from None only when the original exception is an implementation detail
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [raise, from, None, suppress, context]
  files: ["**/*.py"]
  symbols: [__suppress_context__]
related: [python-err-chain-translate]
sources:
  - title: Built-in Exceptions - Exception context
    url: https://docs.python.org/3/library/exceptions.html
  - title: Python Tutorial - Exception Chaining
    url: https://docs.python.org/3/tutorial/errors.html
---

> Suppress a cause with from None only when the original exception is an implementation detail.

## Why

The `from None` clause sets `__suppress_context__`, so the original exception stays available in `__context__` but disappears from the printed traceback. That is correct when the implementation detail is irrelevant to the reader, as when a mapping converts `KeyError` into `AttributeError`. It is wrong when the original failure still explains the bug, because the traceback no longer shows where the data went bad.

## Bad

```python
import json


def load(raw: str) -> dict[str, object]:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise RuntimeError("invalid payload") from None
```

## Good

```python
class Settings:
    def __init__(self, values: dict[str, str]) -> None:
        self._values = values

    def __getattr__(self, name: str) -> str:
        try:
            return self._values[name]
        except KeyError:
            raise AttributeError(name) from None
```

## See Also

- [python-err-chain-translate](err-chain-translate.md) - the default: keep the cause attached to the translation
