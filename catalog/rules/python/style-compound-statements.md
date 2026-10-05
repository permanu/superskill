---
id: python-style-compound-statements
lang: python
prefix: style
title: Keep one statement per line
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [compound statements, one statement, style]
  files: ["**/*.py"]
  symbols: []
related: [python-style-blank-lines]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Avoid compound statements; a body on the header line hides the control flow.

## Why

PEP 8 states that compound statements, meaning multiple statements on the same line, are generally discouraged, and that multi-clause statements must never be folded onto one line. The header line becomes a place where a branch can hide from readers and diff tools. Separate lines also give the debugger a statement to stop on.

## Bad

```python
def process(values: list[int]) -> int:
    total = 0
    for value in values: total += value
    return total
```

## Good

```python
def process(values: list[int]) -> int:
    total = 0
    for value in values:
        total += value
    return total
```

## See Also

- [python-style-blank-lines](style-blank-lines.md) - the other layout rule that keeps structure visible
