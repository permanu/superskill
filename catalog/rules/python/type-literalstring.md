---
id: python-type-literalstring
lang: python
prefix: type
title: Guard sensitive APIs with LiteralString so arbitrary strings are rejected
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [LiteralString, SQL, injection, typing]
  files: ["**/*.py"]
  symbols: [typing.LiteralString]
related: [python-sec-sql-parameters]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
---

> Type sensitive string parameters as LiteralString; a plain str argument then fails type checking.

## Why

The typing docs describe LiteralString as a special type that includes only literal strings: any string literal is compatible, while an object typed as just str is not. The docs present it as useful for sensitive APIs where arbitrary user-generated strings could generate problems, with query construction as the example. A checkered call site that passes runtime data into such an API is flagged before the injection ships.

## Bad

```python
def run_query(sql: str) -> None:
    print(sql)


def lookup(name: str) -> None:
    run_query(f"SELECT * FROM users WHERE name = {name}")
```

## Good

```python
from typing import LiteralString


def run_query(sql: LiteralString) -> None:
    print(sql)


def lookup(name: str) -> None:
    run_query("SELECT * FROM users WHERE name = ?")
```

## See Also

- [python-sec-sql-parameters](sec-sql-parameters.md) - binding values instead of interpolating them
