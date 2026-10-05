---
id: python-num-fractions-exact
lang: python
prefix: num
title: Use Fraction for exact rational arithmetic
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Fraction, rational, exact, arithmetic]
  files: ["**/*.py"]
  symbols: [fractions.Fraction]
related: [python-data-decimal-money, python-data-decimal-from-string]
sources:
  - title: fractions - Rational numbers
    url: https://docs.python.org/3/library/fractions.html
---

> Use Fraction for exact ratios; float division imports representation error that compounds.

## Why

The fractions docs state that the module provides support for rational number arithmetic, and that Fraction instances are hashable and should be treated as immutable. The same page warns that Fraction(1.1) is not exactly 11/10 because the float argument already carries binary error, while Fraction(Decimal('1.1')) is exactly 11/10. Exact ratios keep sums and comparisons exact for as long as the value stays rational.

## Bad

```python
def split_third(value: int) -> float:
    return value / 3
```

## Good

```python
from fractions import Fraction


def split_third(value: int) -> Fraction:
    return Fraction(value, 3)
```

## See Also

- [python-data-decimal-money](data-decimal-money.md) - the decimal counterpart for money
- [python-data-decimal-from-string](data-decimal-from-string.md) - constructing exact decimals from strings
