---
id: python-pat-total-ordering
lang: python
prefix: pat
title: Fill in comparison methods with functools.total_ordering
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [total_ordering, comparisons, rich comparison, functools]
  files: ["**/*.py"]
  symbols: [functools.total_ordering]
related: [python-pat-wraps-decorator]
sources:
  - title: functools - Higher-order functions
    url: https://docs.python.org/3/library/functools.html
---

> Derive the missing comparisons with total_ordering; hand-writing six methods invites mistakes.

## Why

The functools docs state that given a class defining one or more rich comparison ordering methods, total_ordering supplies the rest, and that the class must define one of __lt__, __le__, __gt__, or __ge__ and should supply __eq__. Writing all six by hand duplicates one ordering rule and lets the copies drift apart. The docs also note the derived methods trade a little speed for that convenience.

## Bad

```python
class Version:
    def __init__(self, major: int, minor: int) -> None:
        self.major = major
        self.minor = minor

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Version):
            return NotImplemented
        return (self.major, self.minor) == (other.major, other.minor)

    def __lt__(self, other: "Version") -> bool:
        return (self.major, self.minor) < (other.major, other.minor)
```

## Good

```python
from functools import total_ordering


@total_ordering
class Version:
    def __init__(self, major: int, minor: int) -> None:
        self.major = major
        self.minor = minor

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Version):
            return NotImplemented
        return (self.major, self.minor) == (other.major, other.minor)

    def __lt__(self, other: "Version") -> bool:
        return (self.major, self.minor) < (other.major, other.minor)
```

## See Also

- [python-pat-wraps-decorator](pat-wraps-decorator.md) - another decorator that closes a class-definition gap
