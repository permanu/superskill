---
id: python-type-newtype-ids
lang: python
prefix: type
title: Brand distinct identifiers with NewType instead of reusing the raw primitive
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [NewType, identifiers, brands, ids]
  files: ["**/*.py"]
  symbols: [NewType]
related: [python-type-typeddict-boundary]
sources:
  - title: typing - NewType
    url: https://docs.python.org/3/library/typing.html
---

> Brand distinct identifiers with NewType so IDs cannot be swapped silently.

## Why

`NewType` creates a checker-visible subtype with no runtime wrapper: a `UserId` is not an `int` to the checker, so passing an `OrderId` where a `UserId` is expected fails statically. Operations still return the base type, which stops the brand from spreading through arithmetic. The call is a plain function call at runtime, so there is no object overhead.

## Bad

```python
def fetch_user(user_id: int) -> str:
    return f"user:{user_id}"


def fetch_order(order_id: int) -> str:
    return f"order:{order_id}"


print(fetch_user(fetch_order(1)))
```

## Good

```python
from typing import NewType

UserId = NewType("UserId", int)
OrderId = NewType("OrderId", int)


def fetch_user(user_id: UserId) -> str:
    return f"user:{user_id}"


def fetch_order(order_id: OrderId) -> str:
    return f"order:{order_id}"


print(fetch_user(UserId(1)))
```

## See Also

- [python-type-typeddict-boundary](type-typeddict-boundary.md) - the companion pattern for named record shapes
