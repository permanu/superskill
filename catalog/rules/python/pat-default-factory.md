---
id: python-pat-default-factory
lang: python
prefix: pat
title: Build dataclass mutable defaults with default_factory
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [default_factory, dataclass, mutable default, field]
  files: ["**/*.py"]
  symbols: [dataclasses.field]
related: [python-anti-mutable-default, python-data-dataclass-records]
sources:
  - title: dataclasses - Data Classes
    url: https://docs.python.org/3/library/dataclasses.html
---

> Build mutable dataclass defaults with default_factory; literal mutable defaults are rejected.

## Why

The dataclasses docs state that a default_factory is a zero-argument callable called when a default value is needed, and that it is the way to create new instances of mutable types as default values; their example asserts D().x is not D().x. The same page shows the plain mutable default as code that raises ValueError at class creation, because class attributes would otherwise be shared by every instance. The factory keeps the default per instance.

## Bad

```python
from dataclasses import dataclass


@dataclass
class Team:
    members: list[str] = []
```

## Good

```python
from dataclasses import dataclass, field


@dataclass
class Team:
    members: list[str] = field(default_factory=list)
```

## See Also

- [python-anti-mutable-default](anti-mutable-default.md) - the function-argument version of the same trap
- [python-data-dataclass-records](data-dataclass-records.md) - modeling records with dataclasses
