---
id: python-data-sqlite-row-factory
lang: python
prefix: data
title: Set row_factory to sqlite3.Row for name-based column access
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sqlite3, row_factory, Row, columns]
  files: ["**/*.py"]
  symbols: [sqlite3.Row, row_factory]
related: [python-data-sqlite-transactions]
sources:
  - title: sqlite3 - How to create and use row factories
    url: https://docs.python.org/3/library/sqlite3.html
---

> Set row_factory = sqlite3.Row so rows support column names and mapping access.

## Why

Default rows are plain tuples, so callers index by position and a changed SELECT order silently shifts meaning. `sqlite3.Row` supports both index and case-insensitive name lookup, which makes each query self-describing without a conversion layer. The sqlite3 how-to documents the factory as the supported way to choose row representation.

## Bad

```python
import sqlite3


def names(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("SELECT id, name FROM users")
    return [row[1] for row in rows]
```

## Good

```python
import sqlite3


def names(conn: sqlite3.Connection) -> list[str]:
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT id, name FROM users")
    return [row["name"] for row in rows]
```

## See Also

- [python-data-sqlite-transactions](data-sqlite-transactions.md) - the write side of the same connection
