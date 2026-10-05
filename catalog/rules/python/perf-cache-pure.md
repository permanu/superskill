---
id: python-perf-cache-pure
lang: python
prefix: perf
title: Cache pure functions with functools.cache or a bounded lru_cache
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cache, memoize, lru_cache, pure]
  files: ["**/*.py"]
  symbols: [functools.cache, lru_cache]
related: [python-perf-cache-methods]
sources:
  - title: functools - cache and lru_cache
    url: https://docs.python.org/3/library/functools.html
---

> Cache pure functions with functools.cache or a bounded lru_cache.

## Why

A memoizing decorator removes repeated work when a function is called with the same arguments and returns the same result. `cache` is the smallest unbounded form, while `lru_cache(maxsize=N)` bounds memory on long-running processes. Caching is wrong for functions with side effects, functions that must return fresh mutable objects, or impure inputs such as time and randomness.

## Bad

```python
def fib(n: int) -> int:
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

## Good

```python
from functools import cache


@cache
def fib(n: int) -> int:
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

## See Also

- [python-perf-cache-methods](perf-cache-methods.md) - why methods need per-instance caching instead
