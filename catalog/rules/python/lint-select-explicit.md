---
id: python-lint-select-explicit
lang: python
prefix: lint
title: Make the rule set explicit with select, not ALL or an ignore list
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ruff, select, ignore, rules]
  files: ["**/*.py"]
  symbols: [tomllib.load]
related: [python-lint-config-committed]
sources:
  - title: Ruff - The Ruff Linter
    url: https://docs.astral.sh/ruff/linter/
---

> Select rule families explicitly; ALL silently enables every new rule a release adds.

## Why

The Ruff linter docs recommend preferring lint.select over lint.extend-select to make the rule set explicit, and warn that enabling ALL implicitly enables new rules whenever the tool is upgraded. A curated select list changes only when someone edits it, so upgrades do not reclassify existing code. The docs suggest starting with a small set and adding one group at a time.

## Bad

```python
import tomllib


def configured_rules(pyproject: str) -> list[str]:
    with open(pyproject, "rb") as handle:
        data = tomllib.load(handle)
    return data["tool"]["ruff"]["lint"]["ignore"]
```

## Good

```python
import tomllib


def configured_rules(pyproject: str) -> list[str]:
    with open(pyproject, "rb") as handle:
        data = tomllib.load(handle)
    return data["tool"]["ruff"]["lint"]["select"]
```

## See Also

- [python-lint-config-committed](lint-config-committed.md) - where that select list lives
