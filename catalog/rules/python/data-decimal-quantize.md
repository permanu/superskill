---
id: python-data-decimal-quantize
lang: python
prefix: data
title: Quantize currency results with an explicit rounding mode
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [quantize, rounding, currency, cents]
  files: ["**/*.py"]
  symbols: [quantize, ROUND_HALF_UP]
related: [python-data-decimal-money]
sources:
  - title: decimal - quantize and Rounding modes
    url: https://docs.python.org/3/library/decimal.html
---

> Quantize currency to cents with an explicit rounding mode at the boundary.

## Why

Division and percentage operations produce more digits than currency allows, and the active context decides how they round unless the call overrides it. `quantize` with an explicit mode, such as `ROUND_HALF_UP`, makes the rounding decision visible in the code and independent of thread-local context. The decimal docs present quantize as the tool for monetary results with a fixed number of places.

## Bad

```python
from decimal import Decimal


def split(amount: Decimal, parts: int) -> Decimal:
    return amount / parts
```

## Good

```python
from decimal import ROUND_HALF_UP, Decimal

CENTS = Decimal("0.01")


def split(amount: Decimal, parts: int) -> Decimal:
    return (amount / parts).quantize(CENTS, rounding=ROUND_HALF_UP)
```

## See Also

- [python-data-decimal-money](data-decimal-money.md) - the type this rounding applies to
