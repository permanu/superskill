---
id: python-api-context-manager
lang: python
prefix: api
title: Give resource-owning types the context manager protocol
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [context manager, __enter__, __exit__, api]
  files: ["**/*.py"]
  symbols: [__enter__, __exit__, contextlib.contextmanager]
related: [python-err-context-manager-cleanup]
sources:
  - title: contextlib - Utilities for with-statement contexts
    url: https://docs.python.org/3/library/contextlib.html
---

> Make resource-owning types work with with statements; callers then get release on every exit path.

## Why

The contextlib docs note that most types managing resources support the context manager protocol, which releases the object on leaving the with statement, and present @contextmanager for resources that are not context managers in their own right. A type that only exposes open and close leaves every caller to pair them correctly. Implementing __enter__ and __exit__, or exposing a decorated factory, puts that pairing in one place.

## Bad

```python
class Session:
    def open(self) -> None:
        print("open")

    def close(self) -> None:
        print("close")
```

## Good

```python
class Session:
    def __enter__(self) -> "Session":
        print("open")
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        print("close")
```

## See Also

- [python-err-context-manager-cleanup](err-context-manager-cleanup.md) - the caller side that this protocol enables
