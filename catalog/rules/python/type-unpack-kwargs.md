---
id: python-type-unpack-kwargs
lang: python
prefix: type
title: Type **kwargs with Unpack over a TypedDict
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Unpack, kwargs, TypedDict, typing]
  files: ["**/*.py"]
  symbols: [typing.Unpack]
related: [python-type-typeddict-boundary, python-type-typeddict-notrequired]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
---

> Type **kwargs with Unpack over a TypedDict; object erases every keyword the function accepts.

## Why

The typing docs state that Unpack can be used along with TypedDict for typing **kwargs in a function signature. The TypedDict names each accepted keyword with its type, and the checker rejects unknown keywords and wrong value types at the call site. Annotating the parameter as object or Any accepts every keyword and validates none of them.

## Bad

```python
def connect(host: str, **options: object) -> None:
    print(host, options)
```

## Good

```python
from typing import TypedDict, Unpack


class Options(TypedDict):
    timeout: float
    retries: int


def connect(host: str, **options: Unpack[Options]) -> None:
    print(host, options)
```

## See Also

- [python-type-typeddict-boundary](type-typeddict-boundary.md) - TypedDict for external data shapes
- [python-type-typeddict-notrequired](type-typeddict-notrequired.md) - marking keywords that may be omitted
