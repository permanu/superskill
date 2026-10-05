---
id: python-api-bool-params
lang: python
prefix: api
title: Keep boolean parameters out of positional slots
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [boolean, parameters, flag, api]
  files: ["**/*.py"]
  symbols: [bool]
related: [python-api-keyword-only, python-api-enum-closed-set]
sources:
  - title: Ruff FBT001 - boolean-type-hint-positional-argument
    url: https://docs.astral.sh/ruff/rules/boolean-type-hint-positional-argument/
---

> Keep boolean parameters keyword-only; a bare True at a call site documents nothing.

## Why

Ruff's FBT001 explains that a boolean positional argument is confusing because the value's meaning is not clear to the caller or to future readers, and that the flag limits the function to two behaviors. Its remedies are separate implementations, an Enum, or a keyword-only argument. The keyword-only form keeps the boolean but forces the call site to name it.

## Bad

```python
def export(data: str, compress: bool) -> None:
    print(data, compress)


export("report", True)
```

## Good

```python
def export(data: str, *, compress: bool = False) -> None:
    print(data, compress)


export("report", compress=True)
```

## See Also

- [python-api-keyword-only](api-keyword-only.md) - the star that makes the argument self-documenting
- [python-api-enum-closed-set](api-enum-closed-set.md) - the remedy when the flag starts growing a third state
