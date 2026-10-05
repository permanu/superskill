---
id: python-data-decimal-money
lang: python
prefix: data
title: Represent money and exact decimals with decimal.Decimal instead of float
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [decimal, money, float, accounting]
  files: ["**/*.py"]
  symbols: [Decimal]
related: [python-data-decimal-from-string, python-data-decimal-quantize]
sources:
  - title: decimal - Decimal fixed-point and floating-point arithmetic
    url: https://docs.python.org/3/library/decimal.html
---

> Use Decimal for money; binary floats cannot represent cents exactly.

## Why

Binary floating point cannot represent 1.1 or 2.2 exactly, so `1.1 + 2.2` displays as 3.3000000000000003 and equality tests become unreliable. The decimal docs state that the module is preferred in accounting applications with strict equality invariants and that results like `0.1 + 0.1 + 0.1 - 0.3` are exactly zero in decimal. Decimal arithmetic keeps the digits people wrote.

## Bad

```python
def total(prices: list[float]) -> float:
    return sum(prices)


print(total([0.1, 0.2, 0.3]))
```

## Good

```python
from decimal import Decimal


def total(prices: list[Decimal]) -> Decimal:
    return sum(prices, Decimal("0"))


print(total([Decimal("0.1"), Decimal("0.2"), Decimal("0.3")]))
```

## See Also

- [python-data-decimal-from-string](data-decimal-from-string.md) - constructing those values without importing float error
- [python-data-decimal-quantize](data-decimal-quantize.md) - rounding results to cents explicitly
