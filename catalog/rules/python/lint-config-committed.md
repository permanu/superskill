---
id: python-lint-config-committed
lang: python
prefix: lint
title: Commit the linter configuration instead of passing flags ad hoc
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ruff, configuration, pyproject, reproducibility]
  files: ["**/*.py"]
  symbols: [subprocess.run]
related: [python-lint-select-explicit, python-lint-noqa-coded]
sources:
  - title: Ruff - Configuring Ruff
    url: https://docs.astral.sh/ruff/configuration/
---

> Keep linter settings in a committed config file; flags passed per invocation drift between machines and CI.

## Why

The Ruff configuration docs state that Ruff can be configured through pyproject.toml, ruff.toml, or .ruff.toml, and that command-line options override the settings in every resolved configuration file. Settings supplied only as flags are invisible to editors and to other checkouts, so two environments run different rule sets against the same commit. A committed file makes the rule set reviewable and reproducible.

## Bad

```python
import subprocess


def lint() -> None:
    subprocess.run(
        ["ruff", "check", "--select", "E", "--select", "F", "--line-length", "100"],
        check=True,
    )
```

## Good

```python
import subprocess


def lint() -> None:
    subprocess.run(["ruff", "check"], check=True)
```

## See Also

- [python-lint-select-explicit](lint-select-explicit.md) - choosing the rule set the committed config declares
- [python-lint-noqa-coded](lint-noqa-coded.md) - the per-line exceptions on top of that config
