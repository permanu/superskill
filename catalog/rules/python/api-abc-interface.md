---
id: python-api-abc-interface
lang: python
prefix: api
title: Declare interfaces with abc.ABC and abstractmethod
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [abc, abstractmethod, interface, subclass]
  files: ["**/*.py"]
  symbols: [abc.ABC, abc.abstractmethod]
related: [python-anti-type-equality, python-type-protocol-interface]
sources:
  - title: abc - Abstract Base Classes
    url: https://docs.python.org/3/library/abc.html
---

> Declare interfaces with abc.ABC and abstractmethod; incomplete subclasses then fail at instantiation.

## Why

The abc docs describe the module as the infrastructure for defining abstract base classes in Python and state that a class whose metaclass derives from ABCMeta cannot be instantiated unless all abstract methods and properties are overridden. A base class that raises NotImplementedError only fails when the missing method is called, and the subclass can be constructed with the hole intact. ABC and abstractmethod move the failure to construction time.

## Bad

```python
class Storage:
    def read(self, key: str) -> bytes:
        raise NotImplementedError


class MemoryStorage(Storage):
    pass
```

## Good

```python
from abc import ABC, abstractmethod


class Storage(ABC):
    @abstractmethod
    def read(self, key: str) -> bytes:
        ...


class MemoryStorage(Storage):
    def read(self, key: str) -> bytes:
        return b""
```

## See Also

- [python-anti-type-equality](anti-type-equality.md) - the isinstance checks that ABC registration feeds
- [python-type-protocol-interface](type-protocol-interface.md) - the structural alternative for type checking
