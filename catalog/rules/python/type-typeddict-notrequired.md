---
id: python-type-typeddict-notrequired
lang: python
prefix: type
title: Mark optional TypedDict keys with NotRequired, not total=False
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [NotRequired, TypedDict, total, typing]
  files: ["**/*.py"]
  symbols: [typing.NotRequired]
related: [python-type-typeddict-boundary, python-type-readonly-typeddict]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
  - title: PEP 655 - Marking individual TypedDict items as required or potentially-missing
    url: https://peps.python.org/pep-0655/
---

> Mark optional keys with NotRequired; total=False makes every key optional at once.

## Why

The typing docs describe NotRequired as a special construct to mark a TypedDict key as potentially missing, and their TypedDict section shows the default as all keys required with individual keys marked NotRequired. PEP 655 states that a total=False TypedDict is equivalent to one with all of its keys marked NotRequired, so total=False makes every field optional at once. Marking just the optional keys keeps the required fields enforced.

## Bad

```python
from typing import TypedDict


class Movie(TypedDict, total=False):
    title: str
    year: int
```

## Good

```python
from typing import NotRequired, TypedDict


class Movie(TypedDict):
    title: str
    year: NotRequired[int]
```

## See Also

- [python-type-typeddict-boundary](type-typeddict-boundary.md) - TypedDict for parsed external data
- [python-type-readonly-typeddict](type-readonly-typeddict.md) - the read-only counterpart for stable keys
