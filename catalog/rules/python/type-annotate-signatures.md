---
id: python-type-annotate-signatures
lang: python
prefix: type
title: Annotate every public function signature so unannotated parameters do not silently become Any
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [annotation, signature, public api, Any]
  files: ["**/*.py"]
  symbols: [typing]
related: [python-type-avoid-any]
sources:
  - title: Specification for the Python type system - Type annotations
    url: https://typing.python.org/en/latest/spec/annotations.html
  - title: typing - The Any type
    url: https://docs.python.org/3/library/typing.html
  - title: Google Python Style Guide - Type Annotated Code
    url: https://google.github.io/styleguide/pyguide.html
---

> Annotate every public parameter and return value; unannotated signatures default to Any.

## Why

A function without parameter or return annotations is treated as taking and returning `Any`: the typing spec states that for a checked function the default annotation for arguments and the return type is `Any`, so the checker verifies nothing at that boundary and callers get no help. Public entry points are where annotation pays: they fix the contract other modules program against. Private helpers whose types are obvious from their bodies can stay inferred.

## Bad

```python
def merge_counts(base, extra):
    for key, value in extra.items():
        base[key] = base.get(key, 0) + value
    return base
```

## Good

```python
def merge_counts(base: dict[str, int], extra: dict[str, int]) -> dict[str, int]:
    for key, value in extra.items():
        base[key] = base.get(key, 0) + value
    return base
```

## See Also

- [python-type-avoid-any](type-avoid-any.md) - what to write instead when the parameter type is genuinely open
