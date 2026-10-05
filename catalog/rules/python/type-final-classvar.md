---
id: python-type-final-classvar
lang: python
prefix: type
title: Mark module constants Final and class-level state ClassVar so rebinding is checked
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Final, ClassVar, constants, class state]
  files: ["**/*.py"]
  symbols: [Final, ClassVar]
related: [python-type-annotate-signatures]
sources:
  - title: typing - Final
    url: https://docs.python.org/3/library/typing.html
  - title: typing - ClassVar
    url: https://docs.python.org/3/library/typing.html
---

> Mark constants Final and class-level attributes ClassVar so rebinding is checked.

## Why

`Final` tells the checker a name must not be rebound or overridden, which catches accidental reassignment of configuration. `ClassVar` tells it an attribute belongs to the class rather than instances, so per-instance assignment is flagged instead of silently shadowing shared state. Both are annotation-only constructs with no runtime cost.

## Bad

```python
MAX_ATTEMPTS = 3


class Client:
    default_timeout = 30

    def __init__(self) -> None:
        self.default_timeout = 60
```

## Good

```python
from typing import ClassVar, Final

MAX_ATTEMPTS: Final = 3


class Client:
    default_timeout: ClassVar[int] = 30

    def __init__(self, timeout: int) -> None:
        self.timeout = timeout
```

## See Also

- [python-type-annotate-signatures](type-annotate-signatures.md) - the annotation discipline these qualifiers extend
