---
id: python-num-localcontext-precision
lang: python
prefix: num
title: Scope Decimal precision changes with decimal.localcontext
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [decimal, localcontext, precision, context]
  files: ["**/*.py"]
  symbols: [decimal.localcontext]
related: [python-data-decimal-quantize, python-data-decimal-money]
sources:
  - title: decimal - Decimal fixed-point and floating-point arithmetic
    url: https://docs.python.org/3/library/decimal.html
---

> Change Decimal precision inside localcontext; getcontext().prec mutates thread-wide state.

## Why

The decimal docs describe localcontext as a context manager that sets the active thread's context to a copy on entry and restores the previous context when exiting. Assigning to getcontext().prec edits the shared context in place, so every later calculation in that thread runs at the new precision. A scoped context keeps the change where the sensitive computation lives.

## Bad

```python
from decimal import getcontext


def with_precision() -> None:
    getcontext().prec = 50
    print("changed")
```

## Good

```python
from decimal import localcontext


def with_precision() -> None:
    with localcontext() as context:
        context.prec = 50
        print("scoped")
```

## See Also

- [python-data-decimal-quantize](data-decimal-quantize.md) - rounding currency to cents explicitly
- [python-data-decimal-money](data-decimal-money.md) - why decimal arithmetic exists at all
