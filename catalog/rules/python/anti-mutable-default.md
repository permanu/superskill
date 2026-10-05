---
id: python-anti-mutable-default
lang: python
prefix: anti
title: Never use a mutable default argument; the one default object is shared by every call
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [default, mutable, list, bug]
  files: ["**/*.py"]
  symbols: [None]
related: [python-anti-call-default, python-anti-mutable-class-attribute]
sources:
  - title: The Python Tutorial - More Control Flow Tools
    url: https://docs.python.org/3/tutorial/controlflow.html
  - title: Ruff B006 - mutable-argument-default
    url: https://docs.astral.sh/ruff/rules/mutable-argument-default/
---

> Never use a mutable default argument; the one default object is shared by every call.

## Why

The tutorial's warning is explicit: the default value is evaluated only once, which makes a difference when the default is a mutable object such as a list or dictionary, and its example shows one list accumulating across calls. Ruff's B006 adds that the same object is shared by every call, so modifications persist. The documented fix is a None default with a fresh object built in the function body.

## Bad

```python
def add_item(item: str, basket: list[str] = []) -> list[str]:
    basket.append(item)
    return basket
```

## Good

```python
def add_item(item: str, basket: list[str] | None = None) -> list[str]:
    if basket is None:
        basket = []
    basket.append(item)
    return basket
```

## See Also

- [python-anti-call-default](anti-call-default.md) - the other default-value trap, calls evaluated at definition time
- [python-anti-mutable-class-attribute](anti-mutable-class-attribute.md) - the same sharing problem at class scope
