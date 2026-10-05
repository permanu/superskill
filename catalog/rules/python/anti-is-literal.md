---
id: python-anti-is-literal
lang: python
prefix: anti
title: Compare values with ==; is tests identity and fails for literals
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [identity, literal, SyntaxWarning, comparison]
  files: ["**/*.py"]
  symbols: [SyntaxWarning]
related: [python-anti-none-equality]
sources:
  - title: Ruff F632 - is-literal
    url: https://docs.astral.sh/ruff/rules/is-literal/
---

> Compare values with ==; is tests identity and is wrong for numbers and strings.

## Why

Ruff's F632 explains that is and is not compare identity, so a comparison against a literal is not guaranteed to produce the expected result, and notes that the compiler emits a SyntaxWarning for constant literals. Interning makes some of these comparisons appear to work, which hides the mistake. == and != compare values, which is what the code intends.

## Bad

```python
def is_ok(status: str) -> bool:
    if status is "ok":
        return True
    return False
```

## Good

```python
def is_ok(status: str) -> bool:
    return status == "ok"
```

## See Also

- [python-anti-none-equality](anti-none-equality.md) - the one identity comparison that is correct
