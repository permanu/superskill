---
id: python-data-csv-newline
lang: python
prefix: data
title: Open files for csv with newline set to the empty string
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [csv, newline, open, quoted fields]
  files: ["**/*.py"]
  symbols: [open, csv.reader]
related: [python-data-csv-module, python-data-encoding-explicit]
sources:
  - title: csv - Module Contents
    url: https://docs.python.org/3/library/csv.html
---

> Open files for csv with newline=''; otherwise quoted newlines break parsing.

## Why

The csv docs require `newline=''` when opening files for the module, because the module performs its own newline handling and needs to see embedded newlines inside quoted fields. Without it, a field containing a newline is split into two records, and writing adds an extra carriage return on Windows. The docs state it is always safe to specify.

## Bad

```python
import csv


def read(path: str) -> list[list[str]]:
    with open(path, encoding="utf-8") as handle:
        return list(csv.reader(handle))
```

## Good

```python
import csv


def read(path: str) -> list[list[str]]:
    with open(path, encoding="utf-8", newline="") as handle:
        return list(csv.reader(handle))
```

## See Also

- [python-data-csv-module](data-csv-module.md) - the parser this option enables
- [python-data-encoding-explicit](data-encoding-explicit.md) - the other open() argument every text file needs
