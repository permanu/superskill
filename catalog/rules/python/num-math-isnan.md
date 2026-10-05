---
id: python-num-math-isnan
lang: python
prefix: num
title: Test for NaN with math.isnan, never with equality
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [NaN, isnan, floats, comparison]
  files: ["**/*.py"]
  symbols: [math.isnan]
related: [python-test-float-close, python-num-math-fsum]
sources:
  - title: math - Mathematical functions
    url: https://docs.python.org/3/library/math.html
---

> Test for NaN with math.isnan; a NaN is not equal to anything, including itself.

## Why

The math docs state that math.nan and float('nan') are not considered equal to any other numeric value, including themselves, and that isnan() should be used instead of is or ==. The value != value trick happens to work but reads as a typo, and the docs specifically rule out identity tests. isnan names the check and handles values that arrive from any source.

## Bad

```python
def is_missing(value: float) -> bool:
    return value != value
```

## Good

```python
import math


def is_missing(value: float) -> bool:
    return math.isnan(value)
```

## See Also

- [python-test-float-close](test-float-close.md) - the tolerance-based comparison NaN defeats
- [python-num-math-fsum](num-math-fsum.md) - another numeric-precision rule
