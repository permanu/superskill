---
id: python-anti-call-default
lang: python
prefix: anti
title: Do not call functions in default arguments; the call runs once at definition time
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [default, function call, evaluation, bug]
  files: ["**/*.py"]
  symbols: [None]
related: [python-anti-mutable-default]
sources:
  - title: Ruff B008 - function-call-in-default-argument
    url: https://docs.astral.sh/ruff/rules/function-call-in-default-argument/
---

> Do not call functions in default arguments; the call runs once at definition time, not per call.

## Why

Ruff's B008 states that any function call used as a default argument is performed once, at definition time, and the returned value is reused by all calls. A time.time() default freezes at import, and a factory call shares one object across every invocation. Building the value inside the function keeps it per call.

## Bad

```python
import time


def log(message: str, at: float = time.time()) -> None:
    print(at, message)
```

## Good

```python
import time


def log(message: str, at: float | None = None) -> None:
    if at is None:
        at = time.time()
    print(at, message)
```

## See Also

- [python-anti-mutable-default](anti-mutable-default.md) - the mutable-object case of the same evaluation rule
