---
id: python-data-sqlite-transactions
lang: python
prefix: data
title: Use the connection context manager so transactions commit or roll back
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sqlite3, transaction, commit, rollback]
  files: ["**/*.py"]
  symbols: [sqlite3.Connection]
related: [python-sec-sql-parameters, python-data-sqlite-row-factory]
sources:
  - title: sqlite3 - How to use the connection context manager
    url: https://docs.python.org/3/library/sqlite3.html
---

> Wrap writes in the connection context manager; it commits on success and rolls back on error.

## Why

The connection context manager commits the transaction when the block exits successfully and rolls it back when an exception leaves it, so a failed batch cannot persist half its rows. Calling `commit()` by hand only covers the paths where the call is reached; exceptions skip it. The sqlite3 docs present the context manager as the supported transaction boundary.

## Bad

```python
import sqlite3


def store(conn: sqlite3.Connection, rows: list[tuple[str, int]]) -> None:
    for name, score in rows:
        conn.execute("INSERT INTO scores VALUES (?, ?)", (name, score))
    conn.commit()
```

## Good

```python
import sqlite3


def store(conn: sqlite3.Connection, rows: list[tuple[str, int]]) -> None:
    with conn:
        for name, score in rows:
            conn.execute("INSERT INTO scores VALUES (?, ?)", (name, score))
```

## See Also

- [python-sec-sql-parameters](sec-sql-parameters.md) - binding the values inside the transaction
- [python-data-sqlite-row-factory](data-sqlite-row-factory.md) - reading the rows back by name
