---
id: python-api-singledispatch
lang: python
prefix: api
title: Dispatch on type with functools.singledispatch, not isinstance ladders
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [singledispatch, dispatch, isinstance, generic]
  files: ["**/*.py"]
  symbols: [functools.singledispatch]
related: [python-anti-type-equality]
sources:
  - title: functools - Higher-order functions
    url: https://docs.python.org/3/library/functools.html
---

> Dispatch on type with functools.singledispatch instead of an isinstance ladder.

## Why

The functools docs describe singledispatch as transforming a function into a generic function whose dispatch happens on the type of the first argument, with register adding implementations per type and inferring the type from annotations. An isinstance ladder spreads the same mapping across one function body. Separate registered implementations keep each type's behavior in one place and let other modules add theirs.

## Bad

```python
def to_text(value: object) -> str:
    if isinstance(value, bytes):
        return value.decode("utf-8")
    if isinstance(value, bytearray):
        return bytes(value).decode("utf-8")
    return str(value)
```

## Good

```python
from functools import singledispatch


@singledispatch
def to_text(value: object) -> str:
    return str(value)


@to_text.register
def _(value: bytes) -> str:
    return value.decode("utf-8")


@to_text.register
def _(value: bytearray) -> str:
    return bytes(value).decode("utf-8")
```

## See Also

- [python-anti-type-equality](anti-type-equality.md) - the isinstance test that singledispatch organizes
