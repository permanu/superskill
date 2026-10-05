---
id: python-sec-subprocess-no-shell
lang: python
prefix: sec
title: Pass argument lists to subprocess without shell=True
severity: must
enforce: tool
tool: ruff:S602
baseline: latest
status: verified
triggers:
  keywords: [subprocess, shell, injection, arguments]
  files: ["**/*.py"]
  symbols: [subprocess.run, shell]
related: [python-sec-eval-literal]
sources:
  - title: subprocess - Security Considerations
    url: https://docs.python.org/3/library/subprocess.html
  - title: Ruff - Rules
    url: https://docs.astral.sh/ruff/rules/
---

> Pass argument lists to subprocess; shell=True re-parses input through a shell.

## Why

With `shell=True` the command string is interpreted by the shell, so whitespace and metacharacters in user-controlled text can inject commands; the docs put the quoting responsibility on the application in that mode. An argument list is passed directly to exec, so values never reach a shell parser. Providing a sequence is the documented preference.

## Bad

```python
import subprocess


def compress(path: str) -> None:
    subprocess.run(f"gzip {path}", shell=True, check=True)
```

## Good

```python
import subprocess


def compress(path: str) -> None:
    subprocess.run(["gzip", path], check=True)
```

## See Also

- [python-sec-eval-literal](sec-eval-literal.md) - the same never-interpret-input principle for Python code
