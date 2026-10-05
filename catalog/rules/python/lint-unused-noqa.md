---
id: python-lint-unused-noqa
lang: python
prefix: lint
title: Enable RUF100 so stale suppressions are detected and removed
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [RUF100, unused noqa, suppression, lint]
  files: ["**/*.py"]
  symbols: [RUF100]
related: [python-lint-noqa-coded, python-lint-suppress-line]
sources:
  - title: Ruff - The Ruff Linter
    url: https://docs.astral.sh/ruff/linter/
---

> Enable the unused-noqa check; stale suppressions outlive the findings they were written for.

## Why

The Ruff linter docs describe RUF100 (unused-noqa) as enforcing that suppressions are valid, meaning the violations they name are actually triggered and suppressed, and note that its fix removes unused suppression comments. A suppression whose finding is gone keeps the door open for that rule to be ignored silently. Running with --extend-select RUF100 keeps the suppression list honest.

## Bad

```python
import subprocess


def lint() -> None:
    subprocess.run(["ruff", "check"], check=True)
```

## Good

```python
import subprocess


def lint() -> None:
    subprocess.run(["ruff", "check", "--extend-select", "RUF100"], check=True)
```

## See Also

- [python-lint-noqa-coded](lint-noqa-coded.md) - the coded suppressions this rule validates
- [python-lint-suppress-line](lint-suppress-line.md) - the scoping this rule keeps honest
