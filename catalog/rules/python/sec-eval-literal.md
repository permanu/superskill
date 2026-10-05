---
id: python-sec-eval-literal
lang: python
prefix: sec
title: Parse literal data with ast.literal_eval and never with eval
severity: must
enforce: tool
tool: ruff:S307
baseline: latest
status: verified
triggers:
  keywords: [eval, literal_eval, config, parsing]
  files: ["**/*.py"]
  symbols: [ast.literal_eval, eval]
related: [python-sec-pickle-untrusted]
sources:
  - title: Security Considerations
    url: https://docs.python.org/3/library/security_warnings.html
  - title: Ruff - Rules
    url: https://docs.astral.sh/ruff/rules/
---

> Parse literal data with ast.literal_eval; eval executes arbitrary code.

## Why

`eval` compiles and runs its argument as a Python expression, so any input reaching it is arbitrary code execution. `ast.literal_eval` accepts only literals (strings, numbers, containers, booleans, `None`) and raises `ValueError` on anything else, which is what config and message parsing actually need. Ruff flags eval usage.

## Bad

```python
def parse_config(raw: str) -> object:
    return eval(raw)
```

## Good

```python
import ast


def parse_config(raw: str) -> object:
    return ast.literal_eval(raw)
```

## See Also

- [python-sec-pickle-untrusted](sec-pickle-untrusted.md) - the binary-format version of the same boundary
