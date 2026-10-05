---
id: python-data-decimal-from-string
lang: python
prefix: data
title: Construct Decimal values from strings or integers instead of floats
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Decimal, float, construction, precision]
  files: ["**/*.py"]
  symbols: [Decimal.from_float]
related: [python-data-decimal-money]
sources:
  - title: decimal - Decimal objects and from_float
    url: https://docs.python.org/3/library/decimal.html
---

> Construct Decimal from strings; Decimal(float) imports the float's error.

## Why

Passing a float to `Decimal` performs a lossless conversion of the exact binary value, so `Decimal(0.1)` becomes 0.1000000000000000055511151231257827021181583404541015625. The docs show the same difference between `Decimal.from_float(0.1)` and `Decimal('0.1')`. Parsing the decimal text preserves the value the user intended.

## Bad

```python
from decimal import Decimal

price = Decimal(0.1)
print(price)
```

## Good

```python
from decimal import Decimal

price = Decimal("0.1")
print(price)
```

## See Also

- [python-data-decimal-money](data-decimal-money.md) - the type choice this construction serves
