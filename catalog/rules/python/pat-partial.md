---
id: python-pat-partial
lang: python
prefix: pat
title: Freeze arguments with functools.partial instead of lambda wrappers
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [partial, callable, binding, functools]
  files: ["**/*.py"]
  symbols: [functools.partial]
related: [python-pat-strategy-callable]
sources:
  - title: functools - Higher-order functions
    url: https://docs.python.org/3/library/functools.html
---

> Bind arguments with functools.partial; a lambda wrapper repeats the signature by hand.

## Why

The functools docs describe partial as freezing some portion of a function's arguments and keywords to produce a new object with a simplified signature. The partial object carries the wrapped function and bound arguments as attributes, which introspection and debugging can read. A lambda that calls the function repeats the parameter list and hides that structure.

## Bad

```python
def log(prefix: str, message: str) -> None:
    print(prefix, message)


def make_logger(prefix: str):
    return lambda message: log(prefix, message)
```

## Good

```python
from functools import partial


def log(prefix: str, message: str) -> None:
    print(prefix, message)


def make_logger(prefix: str):
    return partial(log, prefix)
```

## See Also

- [python-pat-strategy-callable](pat-strategy-callable.md) - passing behavior as a callable
