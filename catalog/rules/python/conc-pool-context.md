---
id: python-conc-pool-context
lang: python
prefix: conc
title: Manage multiprocessing pools with with so workers stop
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Pool, context manager, workers, multiprocessing]
  files: ["**/*.py"]
  symbols: [multiprocessing.Pool]
related: [python-conc-main-guard, python-conc-spawn-safety]
sources:
  - title: multiprocessing - Process-based parallelism
    url: https://docs.python.org/3/library/multiprocessing.html
---

> Manage pools with with; an abandoned Pool leaves worker processes running.

## Why

The multiprocessing docs show Pool used as a context manager and note that exiting the block has stopped the pool. A pool created and dropped without close and join leaves its worker processes alive until the interpreter shuts them down, and any work queued to it may be discarded. The with form ties the worker lifetime to the block that uses them.

## Bad

```python
import multiprocessing


def double(value: int) -> int:
    return value * 2


if __name__ == "__main__":
    pool = multiprocessing.Pool(4)
    print(pool.map(double, [1, 2]))
```

## Good

```python
import multiprocessing


def double(value: int) -> int:
    return value * 2


if __name__ == "__main__":
    with multiprocessing.Pool(4) as pool:
        print(pool.map(double, [1, 2]))
```

## See Also

- [python-conc-main-guard](conc-main-guard.md) - the guard around the pool block
- [python-conc-spawn-safety](conc-spawn-safety.md) - choosing how those workers start
