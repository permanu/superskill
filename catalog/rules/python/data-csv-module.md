---
id: python-data-csv-module
lang: python
prefix: data
title: Parse delimited files with the csv module instead of splitting lines
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [csv, delimited, parsing, DictReader]
  files: ["**/*.py"]
  symbols: [csv.reader, csv.DictReader]
related: [python-data-csv-newline]
sources:
  - title: csv - CSV File Reading and Writing
    url: https://docs.python.org/3/library/csv.html
---

> Parse delimited data with csv; split breaks on quoting, escapes, and embedded delimiters.

## Why

CSV permits quoted fields that contain the delimiter, escaped quotes, and embedded newlines, so splitting on commas mis-parses real files. The csv module implements those dialect rules, and `DictReader` maps headers to fields so column order can change. The docs describe the format's variations across applications and the module as the way to hide them.

## Bad

```python
def rows(text: str) -> list[list[str]]:
    return [line.split(",") for line in text.splitlines()]
```

## Good

```python
import csv
import io


def rows(text: str) -> list[list[str]]:
    return list(csv.reader(io.StringIO(text)))
```

## See Also

- [python-data-csv-newline](data-csv-newline.md) - the file-opening detail csv parsing depends on
