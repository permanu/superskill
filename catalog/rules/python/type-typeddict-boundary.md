---
id: python-type-typeddict-boundary
lang: python
prefix: type
title: Model fixed-schema external mappings as TypedDicts instead of dict of Any
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [TypedDict, payload, schema, boundary]
  files: ["**/*.py"]
  symbols: [TypedDict, NotRequired]
related: [python-err-boundary-errors]
sources:
  - title: typing - TypedDict
    url: https://docs.python.org/3/library/typing.html
  - title: typing - Required and NotRequired
    url: https://docs.python.org/3/library/typing.html
---

> Model fixed-schema payloads as TypedDict; dict[str, Any] checks nothing.

## Why

A `TypedDict` names each key and its value type, so checkers verify reads and catch misspelled keys before runtime. The schema lives next to the parser that produces it, and `NotRequired` marks keys that may be absent instead of forcing every access through a guard. `dict[str, Any]` accepts every key and returns a value with no type.

## Bad

```python
from typing import Any


def display_name(payload: dict[str, Any]) -> str:
    return payload["nmae"].strip()
```

## Good

```python
from typing import NotRequired, TypedDict


class UserPayload(TypedDict):
    name: str
    nickname: NotRequired[str]


def display_name(payload: UserPayload) -> str:
    return payload.get("nickname") or payload["name"]
```

## See Also

- [python-err-boundary-errors](err-boundary-errors.md) - validating the payload before it is treated as typed
