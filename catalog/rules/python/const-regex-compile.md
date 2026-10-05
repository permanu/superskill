---
id: python-const-regex-compile
lang: python
prefix: const
title: Precompile repeated regular expressions as module constants
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [regex, compile, constants, re]
  files: ["**/*.py"]
  symbols: [re.compile]
related: [python-const-module-uppercase, python-perf-operator-getters]
sources:
  - title: re - Regular expression operations
    url: https://docs.python.org/3/library/re.html
---

> Compile patterns you reuse into named constants; the module-level functions recompile through a small cache.

## Why

The re docs state that using re.compile and saving the resulting pattern object for reuse is more efficient when the expression is used several times, and they note the module-level functions are shortcuts that go through a bounded cache. A compiled pattern is also a single named place where the expression and its flags live. Naming it turns a magic string into a reviewable constant.

## Bad

```python
import re


def has_date(text: str) -> bool:
    return re.search(r"\d{4}-\d{2}-\d{2}", text) is not None
```

## Good

```python
import re

DATE = re.compile(r"\d{4}-\d{2}-\d{2}")


def has_date(text: str) -> bool:
    return DATE.search(text) is not None
```

## See Also

- [python-const-module-uppercase](const-module-uppercase.md) - naming the compiled pattern
- [python-perf-operator-getters](perf-operator-getters.md) - another module-level tool for repeated work
