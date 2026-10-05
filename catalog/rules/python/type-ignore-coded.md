---
id: python-type-ignore-coded
lang: python
prefix: type
title: Give every type ignore comment an error code so the suppression is scoped
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [type ignore, suppression, error code]
  files: ["**/*.py"]
  symbols: ["type: ignore"]
related: [python-type-narrow-dont-cast]
sources:
  - title: Specification for the Python type system - Type checker directives
    url: https://typing.python.org/en/latest/spec/directives.html
  - title: typing - TYPE_CHECKING
    url: https://docs.python.org/3/library/typing.html
---

> Give every type ignore an error code so only the intended diagnostic is suppressed.

## Why

A bare ignore silences every diagnostic on the line, so a second unrelated error can hide behind it and the comment outlives the reason it was added. The bracketed form names the code, which makes the suppression reviewable and lets checkers restrict it to that cause. When the diagnostic is real, fix the code instead of widening the ignore.

## Bad

```python
def count(config: dict[str, object]) -> int:
    return config["count"]  # type: ignore
```

## Good

```python
def count(config: dict[str, object]) -> int:
    return config["count"]  # type: ignore[return-value]
```

## See Also

- [python-type-narrow-dont-cast](type-narrow-dont-cast.md) - the alternative to ignoring a type mismatch
