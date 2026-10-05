---
id: python-anti-else-after-return
lang: python
prefix: anti
title: Drop the else after a branch that returns
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [else, return, nesting, readability]
  files: ["**/*.py"]
  symbols: [return]
related: [python-err-finally-no-control-flow]
sources:
  - title: Ruff RET505 - superfluous-else-return
    url: https://docs.astral.sh/ruff/rules/superfluous-else-return/
---

> Drop the else after a branch that returns; the else adds a nesting level for nothing.

## Why

Ruff's RET505 states that the else is not needed because the return always breaks out of the enclosing function, and removing it reduces nesting and improves readability. The else block runs only when the if condition was false, which is already the state after the early return. The flat form keeps both outcomes at the same level.

## Bad

```python
def classify(score: int) -> str:
    if score >= 50:
        return "pass"
    else:
        return "fail"
```

## Good

```python
def classify(score: int) -> str:
    if score >= 50:
        return "pass"
    return "fail"
```

## See Also

- [python-err-finally-no-control-flow](err-finally-no-control-flow.md) - where return placement changes semantics, not readability
