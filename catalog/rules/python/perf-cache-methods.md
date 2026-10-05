---
id: python-perf-cache-methods
lang: python
prefix: perf
title: Do not cache instance methods with lru_cache because the cache pins every self
severity: should
enforce: tool
tool: ruff:B019
baseline: latest
status: verified
triggers:
  keywords: [lru_cache, methods, cached_property, memory leak]
  files: ["**/*.py"]
  symbols: [lru_cache, cached_property]
related: [python-perf-cache-pure]
sources:
  - title: functools - lru_cache and cached_property
    url: https://docs.python.org/3/library/functools.html
  - title: Ruff B019 - cached-instance-method
    url: https://docs.astral.sh/ruff/rules/cached-instance-method/
---

> Do not cache instance methods with lru_cache; the cache pins every self forever.

## Why

A method cache keyed on `self` keeps a strong reference to every instance it ever saw, so long-lived processes accumulate objects that can no longer be garbage collected. `cached_property` stores the result on the instance itself, so the value is freed with the object. Module-level caches remain the right tool for functions without instance state.

## Bad

```python
from functools import lru_cache


class Parser:
    def __init__(self, source: str) -> None:
        self.source = source

    @lru_cache(maxsize=None)
    def tokens(self) -> tuple[str, ...]:
        return tuple(self.source.split())
```

## Good

```python
from functools import cached_property


class Parser:
    def __init__(self, source: str) -> None:
        self.source = source

    @cached_property
    def tokens(self) -> tuple[str, ...]:
        return tuple(self.source.split())
```

## See Also

- [python-perf-cache-pure](perf-cache-pure.md) - the module-level case where lru_cache is the right tool
