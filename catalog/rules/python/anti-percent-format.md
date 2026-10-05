---
id: python-anti-percent-format
lang: python
prefix: anti
title: Format strings with f-strings, not percent-style templates
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [format, f-string, percent, readability]
  files: ["**/*.py"]
  symbols: [str.format]
related: [python-obs-lazy-formatting]
sources:
  - title: Ruff UP031 - printf-string-formatting
    url: https://docs.astral.sh/ruff/rules/printf-string-formatting/
---

> Format strings with f-strings; percent formatting separates the template from its values.

## Why

Ruff's UP031 states that printf-style formatting has a number of quirks and leads to less readable code than str.format or f-strings, and recommends the newer constructs. F-strings keep each value next to its replacement field, while the percent form separates the template from the tuple of values. A misplaced conversion or a wrong tuple shape then fails at runtime instead of reading correctly at the call site.

## Bad

```python
def describe(name: str, count: int) -> str:
    return "%s has %d items" % (name, count)
```

## Good

```python
def describe(name: str, count: int) -> str:
    return f"{name} has {count} items"
```

## See Also

- [python-obs-lazy-formatting](obs-lazy-formatting.md) - the logging case where the arguments stay separate on purpose
