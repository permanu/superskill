---
id: python-mem-weakref-cache
lang: python
prefix: mem
title: Cache large values in a WeakValueDictionary so entries die with their referents
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cache, weakref, memory, WeakValueDictionary]
  files: ["**/*.py"]
  symbols: [weakref.WeakValueDictionary]
related: [python-mem-finalize-not-del, python-perf-cache-pure]
sources:
  - title: weakref - Weak references
    url: https://docs.python.org/3/library/weakref.html
---

> Cache large values in a WeakValueDictionary; a strong cache keeps every entry alive for the life of the process.

## Why

The weakref docs name caches as a primary use of weak references: a mapping that does not keep a large object alive solely because it appears in the cache. A plain dict holds a strong reference to each value, so the entry pins the object even after the rest of the program drops it. WeakValueDictionary discards an entry when no strong reference to the value exists any more, and WeakSet does the same for elements.

## Bad

```python
class Image:
    def __init__(self, name: str) -> None:
        self.name = name


_cache: dict[str, Image] = {}


def load(name: str) -> Image:
    image = _cache.get(name)
    if image is None:
        image = Image(name)
        _cache[name] = image
    return image
```

## Good

```python
import weakref


class Image:
    def __init__(self, name: str) -> None:
        self.name = name


_cache: weakref.WeakValueDictionary[str, Image] = weakref.WeakValueDictionary()


def load(name: str) -> Image:
    image = _cache.get(name)
    if image is None:
        image = Image(name)
        _cache[name] = image
    return image
```

## See Also

- [python-mem-finalize-not-del](mem-finalize-not-del.md) - the other weakref facility the docs recommend for lifecycle work
- [python-perf-cache-pure](perf-cache-pure.md) - bounding the cache when entries are worth keeping strongly
