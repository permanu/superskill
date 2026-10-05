---
id: python-lint-unused-imports
lang: python
prefix: lint
title: Delete unused imports; they cost runtime and hide intent
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unused import, F401, imports, lint]
  files: ["**/*.py"]
  symbols: [F401]
related: [python-lint-unused-variables, python-api-all-public]
sources:
  - title: Ruff F401 - unused-import
    url: https://docs.astral.sh/ruff/rules/unused-import/
---

> Remove unused imports; they add import-time work and can hide circular dependencies.

## Why

Ruff's F401 states that unused imports add a performance overhead at runtime and risk creating import cycles, and that they increase the cognitive load of reading the code. For a symbol that is re-exported on purpose, the docs recommend a redundant alias or an __all__ entry instead of a live-but-unused import. For availability checks they point to importlib.util.find_spec.

## Bad

```python
import json
import os


def parse(text: str) -> dict[str, object]:
    return json.loads(text)
```

## Good

```python
import json


def parse(text: str) -> dict[str, object]:
    return json.loads(text)
```

## See Also

- [python-lint-unused-variables](lint-unused-variables.md) - the local-binding version of the same cleanup
- [python-api-all-public](api-all-public.md) - the export list that marks deliberate re-exports
