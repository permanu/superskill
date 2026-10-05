---
id: python-perf-cached-property
lang: python
prefix: perf
title: Cache expensive derived attributes with functools.cached_property
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cached_property, property, caching, functools]
  files: ["**/*.py"]
  symbols: [functools.cached_property]
related: [python-perf-cache-methods, python-perf-cache-pure]
sources:
  - title: functools - Higher-order functions
    url: https://docs.python.org/3/library/functools.html
---

> Cache derived attributes with cached_property; a plain property recomputes on every read.

## Why

The functools docs state that cached_property transforms a method into a property whose value is computed once and then cached as a normal attribute for the life of the instance, and that it is useful for expensive computed properties of instances that are otherwise effectively immutable. A plain property runs its body on every access, so a loop over the attribute repeats the work. The docs also note the cached value can be invalidated by deleting the attribute.

## Bad

```python
class Report:
    def __init__(self, rows: list[int]) -> None:
        self.rows = rows

    @property
    def stats(self) -> dict[str, int]:
        return {"total": sum(self.rows), "count": len(self.rows)}
```

## Good

```python
import functools


class Report:
    def __init__(self, rows: list[int]) -> None:
        self.rows = rows

    @functools.cached_property
    def stats(self) -> dict[str, int]:
        return {"total": sum(self.rows), "count": len(self.rows)}
```

## See Also

- [python-perf-cache-methods](perf-cache-methods.md) - where caching methods with lru_cache goes wrong
- [python-perf-cache-pure](perf-cache-pure.md) - caching pure functions
