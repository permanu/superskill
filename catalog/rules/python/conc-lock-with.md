---
id: python-conc-lock-with
lang: python
prefix: conc
title: Hold locks with with statements, not manual acquire and release
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Lock, acquire, release, with]
  files: ["**/*.py"]
  symbols: [threading.Lock]
related: [python-conc-queue-exchange]
sources:
  - title: threading - Thread-based parallelism
    url: https://docs.python.org/3/library/threading.html
---

> Hold locks with with statements; manual acquire and release leaks the lock when the body raises.

## Why

The threading docs state that all objects with acquire and release methods can be used as context managers for a with statement, with acquire called on entry and release on exit. The RLock section adds that using with is recommended over manual acquire and release calls whenever practical. A manual pair that raises between the calls leaves the lock held and stalls every other thread.

## Bad

```python
import threading

_lock = threading.Lock()


def update(items: list[str], value: str) -> None:
    _lock.acquire()
    items.append(value)
    _lock.release()
```

## Good

```python
import threading

_lock = threading.Lock()


def update(items: list[str], value: str) -> None:
    with _lock:
        items.append(value)
```

## See Also

- [python-conc-queue-exchange](conc-queue-exchange.md) - sharing data without touching locks at all
