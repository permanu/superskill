---
id: python-lint-unused-variables
lang: python
prefix: lint
title: Remove assignments whose value is never used
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unused variable, F841, dead code, lint]
  files: ["**/*.py"]
  symbols: [F841]
related: [python-lint-unused-imports]
sources:
  - title: Ruff F841 - unused-variable
    url: https://docs.astral.sh/ruff/rules/unused-variable/
---

> Remove unused local assignments; a dead variable is a mistake or a missing use.

## Why

Ruff's F841 states that a variable which is defined but not used is likely a mistake and should be removed to avoid confusion, and that an intentionally unused name should be prefixed with an underscore or match the dummy-variable pattern. The fix is marked unsafe because removing the assignment can delete attached comments. Naming the intent with an underscore keeps the value while documenting that it is deliberate.

## Bad

```python
def total(values: list[int]) -> int:
    count = len(values)
    return sum(values)
```

## Good

```python
def total(values: list[int]) -> int:
    return sum(values)
```

## See Also

- [python-lint-unused-imports](lint-unused-imports.md) - the module-level version of the same cleanup
