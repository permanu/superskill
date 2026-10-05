---
id: python-num-math-fsum
lang: python
prefix: num
title: Sum floats with math.fsum for an accurate total
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fsum, floats, precision, sum]
  files: ["**/*.py"]
  symbols: [math.fsum]
related: [python-test-float-close, python-num-statistics-mean]
sources:
  - title: math - Mathematical functions
    url: https://docs.python.org/3/library/math.html
  - title: Built-in Functions - sum
    url: https://docs.python.org/3/library/functions.html#sum
---

> Sum floats with math.fsum; compensated sum() can still lose precision when a large addend cancels.

## Why

The math docs state that fsum returns an accurate floating-point sum, avoiding loss of precision by tracking multiple intermediate partial sums. The built-in sum docs describe the 3.12 change as higher accuracy and better commutativity on most builds, and they point to math.fsum for extended precision. The compensation still has limits: with a large addend that later cancels, the absorbed small addends can lose precision, so below sum() returns 0.9999999999999999 while fsum returns 1.0.

## Bad

```python
def total(values: list[float]) -> float:
    return sum(values)


values = [1e100] + [0.1] * 10 + [-1e100]
print(total(values))
```

## Good

```python
import math


def total(values: list[float]) -> float:
    return math.fsum(values)


values = [1e100] + [0.1] * 10 + [-1e100]
print(total(values))
```

## See Also

- [python-test-float-close](test-float-close.md) - comparing float results with a tolerance
- [python-num-statistics-mean](num-statistics-mean.md) - the statistics-module version for summaries
