---
id: python-lint-suppress-line
lang: python
prefix: lint
title: Suppress on the line that triggers the finding, not file-wide
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [noqa, file-level, suppression, scope]
  files: ["**/*.py"]
  symbols: [noqa]
related: [python-lint-noqa-coded, python-lint-unused-noqa]
sources:
  - title: Ruff - The Ruff Linter
    url: https://docs.astral.sh/ruff/linter/
---

> Keep suppressions on the triggering line; a file-level noqa hides every future finding in the file.

## Why

The Ruff linter docs describe file-level suppression: a # ruff: noqa: F401 line anywhere in the file ignores that rule across the whole file, while a trailing # noqa: F401 covers one line. The file-level form keeps suppressing new violations as the file grows, so the accepted exceptions are no longer visible at the sites that caused them. Line-level comments keep the exception next to its reason.

## Bad

```python
# ruff: noqa: F401

import os


def home() -> str:
    return "/"
```

## Good

```python
import os  # noqa: F401


def home() -> str:
    return "/"
```

## See Also

- [python-lint-noqa-coded](lint-noqa-coded.md) - naming the rule the suppression accepts
- [python-lint-unused-noqa](lint-unused-noqa.md) - removing suppressions that match nothing
