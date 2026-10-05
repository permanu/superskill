---
id: python-style-blank-lines
lang: python
prefix: style
title: Separate definitions with the standard blank lines
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [blank lines, layout, structure, style]
  files: ["**/*.py"]
  symbols: []
related: [python-style-compound-statements]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Two blank lines around top-level definitions, one between methods.

## Why

PEP 8 states that top-level function and class definitions are surrounded by two blank lines and that method definitions inside a class are surrounded by a single blank line. The spacing is what makes a file's structure visible when skimming. Extra blank lines may separate groups of related functions, but the base rhythm stays constant.

## Bad

```python
class Store:
    def get(self) -> str:
        return "value"
    def put(self, value: str) -> None:
        print(value)
```

## Good

```python
class Store:
    def get(self) -> str:
        return "value"

    def put(self, value: str) -> None:
        print(value)
```

## See Also

- [python-style-compound-statements](style-compound-statements.md) - the other layout rule for statement structure
