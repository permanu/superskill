---
id: python-type-alias-statement
lang: python
prefix: type
title: Declare type aliases with the type statement instead of assignment or TypeAlias
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [alias, type statement, TypeAlias, typing]
  files: ["**/*.py"]
  symbols: [TypeAlias, TypeAliasType]
related: [python-type-generic-syntax]
sources:
  - title: PEP 695 - Generic Type Alias
    url: https://peps.python.org/pep-0695/
  - title: typing - Type aliases
    url: https://docs.python.org/3/library/typing.html
---

> Declare aliases with the type statement so they are scoped, lazy, and introspectable.

## Why

The `type` statement creates a `TypeAliasType` whose value is evaluated lazily, supports generic parameters, and is distinguishable from a variable assignment by readers and tools. Assignment aliases look like ordinary variables, and `TypeAlias` is deprecated in favor of the statement. Recursive and forward-referencing aliases work without quotes.

## Bad

```python
from typing import TypeAlias

Headers: TypeAlias = dict[str, str]


def encode(headers: Headers) -> bytes:
    return b"\r\n".join(f"{key}: {value}".encode() for key, value in headers.items())
```

## Good

```python
type Headers = dict[str, str]


def encode(headers: Headers) -> bytes:
    return b"\r\n".join(f"{key}: {value}".encode() for key, value in headers.items())
```

## See Also

- [python-type-generic-syntax](type-generic-syntax.md) - the same syntax family for generic parameters
