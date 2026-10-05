---
id: python-perf-join-strings
lang: python
prefix: perf
title: Build strings with join, not repeated concatenation
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [join, string concatenation, performance, strings]
  files: ["**/*.py"]
  symbols: [str.join]
related: [python-perf-comprehension-build]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Build strings with str.join; repeated += relies on an optimization that is not guaranteed.

## Why

PEP 8 states that code should not rely on CPython's efficient implementation of in-place string concatenation, that the optimization is fragile and absent from implementations without refcounting, and that ''.join() should be used in performance-sensitive code to guarantee linear-time concatenation. A loop of += creates a new string per iteration on implementations without the optimization. join states the intent and the complexity.

## Bad

```python
def render(lines: list[str]) -> str:
    text = ""
    for line in lines:
        text += line + "\n"
    return text
```

## Good

```python
def render(lines: list[str]) -> str:
    return "\n".join(lines) + "\n"
```

## See Also

- [python-perf-comprehension-build](perf-comprehension-build.md) - the other accumulate-vs-build rule
