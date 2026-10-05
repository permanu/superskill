---
id: python-style-string-quotes
lang: python
prefix: style
title: Pick one quote character and stay consistent
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [quotes, strings, consistency, style]
  files: ["**/*.py"]
  symbols: []
related: [python-style-whitespace-operators]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Choose a quote style and keep it; switch only to avoid backslashes in the string.

## Why

PEP 8 states that single and double quotes are equivalent, that the guide makes no recommendation, and that a project should pick a rule and stick to it, using the other quote when it avoids backslashes. Consistency removes noise from diffs and reviews. Triple-quoted strings always use double quotes to match the docstring convention.

## Bad

```python
def greeting(name: str) -> str:
    return 'Hello ' + name + "!"
```

## Good

```python
def greeting(name: str) -> str:
    return f"Hello {name}!"
```

## See Also

- [python-style-whitespace-operators](style-whitespace-operators.md) - the other formatting choice PEP 8 leaves to consistency
