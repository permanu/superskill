---
id: python-mem-exit-stack
lang: python
prefix: mem
title: Manage a dynamic set of resources with contextlib.ExitStack
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ExitStack, cleanup, resources, contextlib]
  files: ["**/*.py"]
  symbols: [contextlib.ExitStack]
related: [python-err-context-manager-cleanup]
sources:
  - title: contextlib - Utilities for with-statement contexts
    url: https://docs.python.org/3/library/contextlib.html
---

> Register a dynamic set of resources on one ExitStack; a failure while acquiring later ones still releases the earlier ones.

## Why

The contextlib docs describe ExitStack as a context manager designed to combine other context managers and cleanup functions programmatically, especially when the set is optional or driven by input data. Their file example registers each opened file as it is acquired and notes that all of them close at the end of the with statement, even if a later open raises. A list comprehension of open calls has no owner: when one call fails, the handles already acquired are registered nowhere and leak.

## Bad

```python
def read_all(paths: list[str]) -> str:
    handles = [open(path, encoding="utf-8") for path in paths]
    try:
        return "".join(handle.read() for handle in handles)
    finally:
        for handle in handles:
            handle.close()
```

## Good

```python
from contextlib import ExitStack


def read_all(paths: list[str]) -> str:
    with ExitStack() as stack:
        handles = [stack.enter_context(open(path, encoding="utf-8")) for path in paths]
        return "".join(handle.read() for handle in handles)
```

## See Also

- [python-err-context-manager-cleanup](err-context-manager-cleanup.md) - the fixed-set case that a plain with statement covers
