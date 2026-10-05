---
id: python-mem-finalizer-call
lang: python
prefix: mem
title: Release explicitly by calling the finalizer so cleanup runs at most once
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [finalizer, cleanup, idempotent, weakref]
  files: ["**/*.py"]
  symbols: [weakref.finalize]
related: [python-mem-finalize-not-del, python-mem-weakref-cache]
sources:
  - title: weakref - Weak references
    url: https://docs.python.org/3/library/weakref.html
---

> Release resources by calling the finalizer itself; calling the cleanup function directly lets the finalizer run again at collection.

## Why

The weakref docs state that a finalizer is alive until it is called, either explicitly or at garbage collection, and that after that call it is dead; calling a dead finalizer returns None. The docs' TempDir comparison implements remove() as self._finalizer() for this reason. Invoking the underlying cleanup function directly leaves the finalizer alive, so the same cleanup runs a second time when the object is collected.

## Bad

```python
import weakref


class TempDir:
    def __init__(self, path: str) -> None:
        self.path = path
        self._finalizer = weakref.finalize(self, TempDir._cleanup, path)

    @staticmethod
    def _cleanup(path: str) -> None:
        print(f"removing {path}")

    def remove(self) -> None:
        TempDir._cleanup(self.path)
```

## Good

```python
import weakref


class TempDir:
    def __init__(self, path: str) -> None:
        self.path = path
        self._finalizer = weakref.finalize(self, TempDir._cleanup, path)

    @staticmethod
    def _cleanup(path: str) -> None:
        print(f"removing {path}")

    def remove(self) -> None:
        self._finalizer()
```

## See Also

- [python-mem-finalize-not-del](mem-finalize-not-del.md) - choosing finalize over __del__
- [python-mem-weakref-cache](mem-weakref-cache.md) - the other weakref API the docs recommend before hand-rolled references
