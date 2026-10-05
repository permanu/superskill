---
id: python-mem-break-cycles
lang: python
prefix: mem
title: Break reference cycles with a weak edge so refcounting can reclaim the objects
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cycle, garbage collection, weakref, leak]
  files: ["**/*.py"]
  symbols: [weakref.ref, gc.collect]
related: [python-mem-weakref-cache, python-mem-finalize-not-del]
sources:
  - title: gc - Garbage Collector interface
    url: https://docs.python.org/3/library/gc.html
  - title: weakref - Weak references
    url: https://docs.python.org/3/library/weakref.html
---

> Break reference cycles with one weak edge; cyclic garbage waits for a collector pass instead of being freed immediately.

## Why

The gc docs describe the collector as supplementing the reference counting already used in Python, which frees an object the moment its last strong reference disappears; objects in a cycle keep each other alive, so they are reclaimed only when a collection runs. The weakref docs explain that a weak reference is not enough to keep the referent alive and that when only weak references remain, the referent can be destroyed. Making one side of a cycle weak turns it back into refcounted garbage that is freed as soon as the external references drop.

## Bad

```python
class Node:
    def __init__(self, name: str) -> None:
        self.name = name
        self.peer: "Node | None" = None


def link(left: Node, right: Node) -> None:
    left.peer = right
    right.peer = left
```

## Good

```python
import weakref


class Node:
    def __init__(self, name: str) -> None:
        self.name = name
        self._peer: weakref.ReferenceType[Node] | None = None

    @property
    def peer(self) -> "Node | None":
        return None if self._peer is None else self._peer()

    @peer.setter
    def peer(self, value: "Node | None") -> None:
        self._peer = None if value is None else weakref.ref(value)


def link(left: Node, right: Node) -> None:
    left.peer = right
    right.peer = left
```

## See Also

- [python-mem-weakref-cache](mem-weakref-cache.md) - weak references in caches
- [python-mem-finalize-not-del](mem-finalize-not-del.md) - cleanup that survives cycles
