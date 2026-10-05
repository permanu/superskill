---
id: python-lint-fix-safe
lang: python
prefix: lint
title: Apply only safe fixes automatically; review unsafe ones
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fix, unsafe fixes, automation, lint]
  files: ["**/*.py"]
  symbols: [subprocess.run]
related: [python-lint-unused-variables]
sources:
  - title: Ruff - The Ruff Linter
    url: https://docs.astral.sh/ruff/linter/
---

> Automate safe fixes only; unsafe fixes can change runtime behavior and need review.

## Why

The Ruff linter docs explain that safe fixes retain the meaning and intent of the code, while unsafe fixes could change runtime behavior, remove comments, or both, and they give an exception-type change as the example. Ruff enables only safe fixes by default; unsafe fixes require an explicit flag. Automation should keep that default and leave the unsafe changes to a reviewer.

## Bad

```python
import subprocess


def lint() -> None:
    subprocess.run(["ruff", "check", "--fix", "--unsafe-fixes"], check=True)
```

## Good

```python
import subprocess


def lint() -> None:
    subprocess.run(["ruff", "check", "--fix"], check=True)
```

## See Also

- [python-lint-unused-variables](lint-unused-variables.md) - a rule whose fix is marked unsafe for exactly this reason
