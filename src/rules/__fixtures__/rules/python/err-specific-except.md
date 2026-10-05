---
id: python-err-specific-except
lang: python
prefix: err
title: Catch the specific exception the caller can recover from
severity: should
enforce: tool
tool: ruff:TRY003
baseline: Python 3.14
status: verified
triggers:
  keywords: [except, error, raise]
  files: ["**/*.py"]
sources:
  - title: Python Tutorial - Errors and Exceptions
    url: https://docs.python.org/3/tutorial/errors.html
---
> Catch the narrowest exception type that the branch handles.

## Why

A bare except swallows programming errors and process signals. Naming the expected type keeps failures visible.

## Bad

```python
try:
    value = parse(raw)
except Exception:
    value = None
```

## Good

```python
try:
    value = parse(raw)
except ValueError:
    value = None
```
