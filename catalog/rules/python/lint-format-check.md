---
id: python-lint-format-check
lang: python
prefix: lint
title: Let the formatter own layout and check it in CI
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [formatter, format check, CI, layout]
  files: ["**/*.py"]
  symbols: [subprocess.run]
related: [python-lint-config-committed]
sources:
  - title: Ruff - The Ruff Linter
    url: https://docs.astral.sh/ruff/linter/
  - title: Ruff - Configuring Ruff
    url: https://docs.astral.sh/ruff/configuration/
---

> Run the formatter in check mode; layout lint rules duplicate what the formatter already fixes.

## Why

The Ruff linter docs describe the formatting rule category as generally redundant with a code formatter and recommend leaving it off when a formatter is used. The configuration reference shows ruff format --check as the mode that exits non-zero when files would change, without writing them. Running that check in CI keeps diffs about behavior rather than whitespace.

## Bad

```python
import subprocess


def ci() -> None:
    subprocess.run(["ruff", "check", "--select", "E501"], check=True)
```

## Good

```python
import subprocess


def ci() -> None:
    subprocess.run(["ruff", "format", "--check"], check=True)
```

## See Also

- [python-lint-config-committed](lint-config-committed.md) - committing the shared formatter and linter settings
