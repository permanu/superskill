---
id: python-num-integer-sqrt
lang: python
prefix: num
title: Take integer square roots with math.isqrt
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [isqrt, integer, square root, exact]
  files: ["**/*.py"]
  symbols: [math.isqrt]
related: [python-num-fractions-exact, python-num-math-fsum]
sources:
  - title: math - Mathematical functions
    url: https://docs.python.org/3/library/math.html
---

> Take integer square roots with math.isqrt; converting through float loses precision on large ints.

## Why

The math docs state that isqrt returns the integer square root of a nonnegative integer, the floor of the exact square root. math.sqrt converts its argument to a float, and floats carry at most 53 bits of precision, so large integers cannot round-trip through it. Integer work should stay in integers.

## Bad

```python
import math


def is_square(value: int) -> bool:
    root = int(math.sqrt(value))
    return root * root == value
```

## Good

```python
import math


def is_square(value: int) -> bool:
    root = math.isqrt(value)
    return root * root == value
```

## See Also

- [python-num-fractions-exact](num-fractions-exact.md) - keeping arithmetic exact instead of going through floats
- [python-num-math-fsum](num-math-fsum.md) - another exactness rule for numeric code
