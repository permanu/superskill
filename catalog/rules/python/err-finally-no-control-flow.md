---
id: python-err-finally-no-control-flow
lang: python
prefix: err
title: Never return, break, or continue out of a finally block
severity: must
enforce: tool
tool: ruff:B012
baseline: latest
status: verified
triggers:
  keywords: [finally, return, break, continue, cleanup]
  files: ["**/*.py"]
  symbols: [finally]
related: [python-err-context-manager-cleanup]
sources:
  - title: Python Tutorial - Defining Clean-up Actions
    url: https://docs.python.org/3/tutorial/errors.html
  - title: PEP 765 - Disallow return/break/continue that exit a finally block
    url: https://peps.python.org/pep-0765/
  - title: Ruff B012 - jump-statement-in-finally
    url: https://docs.astral.sh/ruff/rules/jump-statement-in-finally/
---

> Never return, break, or continue out of a finally block; it discards the in-flight exception.

## Why

Control flow that leaves a `finally` block suppresses the exception being unwound, so failures vanish instead of propagating and the returned value silently overrides the `try` result. The compiler warns about this pattern precisely because the resulting bug is silent. Put the return after the `try` statement or handle the specific exception where the default belongs.

## Bad

```python
def parse(raw: str) -> int:
    try:
        return int(raw)
    finally:
        return 0
```

## Good

```python
def parse(raw: str) -> int:
    try:
        return int(raw)
    except ValueError:
        return 0
```

## See Also

- [python-err-context-manager-cleanup](err-context-manager-cleanup.md) - expressing cleanup with `with` instead of hand-written `finally`
