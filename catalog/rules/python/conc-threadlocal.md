---
id: python-conc-threadlocal
lang: python
prefix: conc
title: Keep per-thread state in threading.local
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [thread-local, local, state, threads]
  files: ["**/*.py"]
  symbols: [threading.local]
related: [python-conc-lock-with]
sources:
  - title: threading - Thread-based parallelism
    url: https://docs.python.org/3/library/threading.html
---

> Keep per-thread state in threading.local; a shared dict keyed by thread id grows and races.

## Why

The threading docs describe thread-local data as data whose values are thread specific, and state that a local object is the way to hold it: each thread sees its own attributes, and changes in one thread do not affect another. A module-level dictionary keyed by thread identifier reimplements that mechanism without the lifecycle handling, and entries are never removed when a thread exits. The local object also works when thread identifiers are recycled.

## Bad

```python
import threading

_state: dict[int, str] = {}


def remember(value: str) -> None:
    _state[threading.get_ident()] = value
```

## Good

```python
import threading

_state = threading.local()


def remember(value: str) -> None:
    _state.value = value
```

## See Also

- [python-conc-lock-with](conc-lock-with.md) - what to do when the state really is shared
