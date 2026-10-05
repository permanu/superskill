---
id: python-pat-wraps-decorator
lang: python
prefix: pat
title: Preserve wrapped metadata with functools.wraps in decorators
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [decorator, wraps, metadata, functools]
  files: ["**/*.py"]
  symbols: [functools.wraps]
related: [python-obs-stacklevel-wrappers]
sources:
  - title: functools - Higher-order functions
    url: https://docs.python.org/3/library/functools.html
---

> Wrap with functools.wraps; without it the decorated function loses its name and docstring.

## Why

The functools docs state that without update_wrapper the metadata of the returned function reflects the wrapper definition rather than the original, and their example shows the name and docstring disappearing. The docs also note that update_wrapper adds a __wrapped__ attribute for introspection and for bypassing the decorator. Debuggers, help(), and test frameworks all read that metadata.

## Bad

```python
import time


def timed(func):
    def wrapper(*args: object, **kwargs: object) -> object:
        start = time.perf_counter()
        result = func(*args, **kwargs)
        print(time.perf_counter() - start)
        return result

    return wrapper
```

## Good

```python
import functools
import time


def timed(func):
    @functools.wraps(func)
    def wrapper(*args: object, **kwargs: object) -> object:
        start = time.perf_counter()
        result = func(*args, **kwargs)
        print(time.perf_counter() - start)
        return result

    return wrapper
```

## See Also

- [python-obs-stacklevel-wrappers](obs-stacklevel-wrappers.md) - the other wrapper-hygiene rule
