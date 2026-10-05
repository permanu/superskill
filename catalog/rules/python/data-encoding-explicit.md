---
id: python-data-encoding-explicit
lang: python
prefix: data
title: Pass encoding utf-8 to every text file operation
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [encoding, utf-8, open, locale]
  files: ["**/*.py"]
  symbols: [open, read_text, write_text]
related: [python-data-csv-newline]
sources:
  - title: PEP 597 - Add optional EncodingWarning
    url: https://peps.python.org/pep-0597/
---

> Pass encoding='utf-8' explicitly; the locale default varies by machine.

## Why

Text I/O without an explicit encoding uses the locale encoding, which is not UTF-8 on many Windows systems. PEP 597 documents install and decode failures caused by exactly this omission and recommends `encoding="utf-8"` for text files, with `EncodingWarning` available to find the missing arguments. Explicit UTF-8 makes behavior identical across machines.

## Bad

```python
from pathlib import Path


def read(path: Path) -> str:
    return path.read_text()
```

## Good

```python
from pathlib import Path


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")
```

## See Also

- [python-data-csv-newline](data-csv-newline.md) - the other open() argument csv files require
