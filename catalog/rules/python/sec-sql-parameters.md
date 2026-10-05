---
id: python-sec-sql-parameters
lang: python
prefix: sec
title: Bind SQL values as parameters instead of interpolating them into statements
severity: must
enforce: tool
tool: ruff:S608
baseline: latest
status: verified
triggers:
  keywords: [sql, injection, parameters, placeholders]
  files: ["**/*.py"]
  symbols: [sqlite3.Connection.execute]
related: [python-data-sqlite-transactions]
sources:
  - title: sqlite3 - How to use placeholders to bind values in SQL queries
    url: https://docs.python.org/3/library/sqlite3.html
  - title: Ruff - Rules
    url: https://docs.astral.sh/ruff/rules/
---

> Bind SQL values as parameters; interpolated SQL is injectable.

## Why

Building a statement with f-strings or `%` lets user data change the query structure, which is SQL injection. The sqlite3 docs say to always use placeholders instead of string formatting to bind Python values. The driver passes the values separately and quotes them, so a value stays a value no matter what it contains.

## Bad

```python
import sqlite3


def find(conn: sqlite3.Connection, name: str) -> list[tuple[object, ...]]:
    cursor = conn.execute(f"SELECT * FROM users WHERE name = '{name}'")
    return cursor.fetchall()
```

## Good

```python
import sqlite3


def find(conn: sqlite3.Connection, name: str) -> list[tuple[object, ...]]:
    cursor = conn.execute("SELECT * FROM users WHERE name = ?", (name,))
    return cursor.fetchall()
```

## See Also

- [python-data-sqlite-transactions](data-sqlite-transactions.md) - committing the bound writes safely
