---
id: python-err-custom-hierarchy
lang: python
prefix: err
title: Define one public base error per package and derive domain failures from it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exception, hierarchy, custom, error, domain]
  files: ["**/*.py"]
  symbols: [Exception, BaseException]
related: [python-err-chain-translate, python-err-boundary-errors]
sources:
  - title: Python Tutorial - User-defined Exceptions
    url: https://docs.python.org/3/tutorial/errors.html
  - title: Built-in Exceptions
    url: https://docs.python.org/3/library/exceptions.html
  - title: Google Python Style Guide - Exceptions
    url: https://google.github.io/styleguide/pyguide.html
---

> Define one public base error per package and derive domain failures from it.

## Why

Callers need a single class that catches everything the package raises without catching unrelated failures. Subclassing `Exception` keeps the error catchable by ordinary handlers, and a stable `Error` base keeps the hierarchy navigable as it grows. Built-in types stay reserved for built-in situations; domain failures get their own names and payload attributes.

## Bad

```python
def withdraw(balance: float, amount: float) -> float:
    if amount > balance:
        raise Exception("insufficient funds")
    if amount <= 0:
        raise RuntimeError(f"invalid amount: {amount}")
    return balance - amount
```

## Good

```python
class PaymentsError(Exception):
    """Base class for every failure raised by this package."""


class InsufficientFunds(PaymentsError):
    def __init__(self, balance: float, amount: float) -> None:
        super().__init__(f"balance {balance} cannot cover {amount}")
        self.balance = balance
        self.amount = amount


def withdraw(balance: float, amount: float) -> float:
    if amount <= 0:
        raise ValueError(f"amount must be positive, got {amount}")
    if amount > balance:
        raise InsufficientFunds(balance, amount)
    return balance - amount
```

## See Also

- [python-err-chain-translate](err-chain-translate.md) - translating lower-level failures into the package base
- [python-err-boundary-errors](err-boundary-errors.md) - picking built-in types at the validation boundary
