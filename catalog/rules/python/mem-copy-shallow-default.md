---
id: python-mem-copy-shallow-default
lang: python
prefix: mem
title: Default to a shallow copy; deepcopy recursively duplicates everything it can reach
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [copy, deepcopy, snapshot, memory]
  files: ["**/*.py"]
  symbols: [copy.deepcopy, copy.copy]
related: [python-data-dataclass-frozen]
sources:
  - title: copy - Shallow and deep copy operations
    url: https://docs.python.org/3/library/copy.html
---

> Default to a shallow copy; deepcopy recurses through everything reachable and can copy far more than intended.

## Why

The copy docs describe a shallow copy as a new compound object holding references to the objects found in the original, while a deep copy inserts copies of those objects recursively. They list two problems specific to deep copy: recursive objects may cause a recursive loop, and because it copies everything it may copy too much, such as data intended to be shared between copies. Shallow copies of built-in collections are available directly as methods such as dict.copy(). Reach for deepcopy only when nested objects must not be shared with the original.

## Bad

```python
import copy


def snapshot(config: dict[str, list[int]]) -> dict[str, list[int]]:
    return copy.deepcopy(config)
```

## Good

```python
def snapshot(config: dict[str, list[int]]) -> dict[str, list[int]]:
    return dict(config)
```

## See Also

- [python-data-dataclass-frozen](data-dataclass-frozen.md) - immutable records that need no copying at all
