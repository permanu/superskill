---
id: python-lint-noqa-coded
lang: python
prefix: lint
title: Suppress with a rule code, not a bare noqa
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [noqa, suppression, lint, codes]
  files: ["**/*.py"]
  symbols: [noqa]
related: [python-lint-suppress-line, python-lint-unused-noqa]
sources:
  - title: Ruff - The Ruff Linter
    url: https://docs.astral.sh/ruff/linter/
---

> Write noqa comments with the specific rule codes; a bare noqa hides every finding on the line.

## Why

The Ruff linter docs show the difference: a trailing # noqa: F841 ignores one named rule on that line, while a bare # noqa ignores all violations on it. The blanket form also silences findings that appear later, when the line is edited for another reason. The coded form documents exactly which finding was accepted.

## Bad

```python
import os  # noqa


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

- [python-lint-suppress-line](lint-suppress-line.md) - keeping the coded suppression scoped to one line
- [python-lint-unused-noqa](lint-unused-noqa.md) - detecting suppressions that no longer match anything
