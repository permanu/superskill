---
id: python-mem-weakref-slots
lang: python
prefix: mem
title: Add '__weakref__' to __slots__ when instances are weak-referenced
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [slots, weakref, memory, TypeError]
  files: ["**/*.py"]
  symbols: [__slots__, __weakref__]
related: [python-mem-finalize-not-del, python-mem-weakref-cache]
sources:
  - title: weakref - Weak references
    url: https://docs.python.org/3/library/weakref.html
---

> Add '__weakref__' to __slots__ when instances need weak references; slots otherwise disable them.

## Why

The weakref docs state that when __slots__ are defined for a given type, weak reference support is disabled unless the declaration also contains '__weakref__'. Code that registers a finalizer, caches instances in a WeakSet, or hands objects to a framework that holds them weakly will find that the instances cannot be weakly referenced. Adding the slot restores weak-reference support without giving every instance a dictionary.

## Bad

```python
class Token:
    __slots__ = ("value",)

    def __init__(self, value: str) -> None:
        self.value = value
```

## Good

```python
class Token:
    __slots__ = ("value", "__weakref__")

    def __init__(self, value: str) -> None:
        self.value = value
```

## See Also

- [python-mem-finalize-not-del](mem-finalize-not-del.md) - registering cleanup for slotted instances
- [python-mem-weakref-cache](mem-weakref-cache.md) - caching slotted instances weakly
