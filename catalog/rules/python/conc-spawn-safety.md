---
id: python-conc-spawn-safety
lang: python
prefix: conc
title: Start processes with spawn or forkserver, not fork, when threads may exist
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fork, spawn, forkserver, multiprocessing]
  files: ["**/*.py"]
  symbols: [multiprocessing.get_context]
related: [python-conc-main-guard, python-conc-process-picklable]
sources:
  - title: multiprocessing - Process-based parallelism
    url: https://docs.python.org/3/library/multiprocessing.html
---

> Start processes with spawn or forkserver; safely forking a multithreaded process is problematic.

## Why

The multiprocessing docs state that the fork method makes the child effectively identical to the parent and that safely forking a multithreaded process is problematic, and the 3.14 change notes remove fork as the default on every platform. The forkserver method keeps a single-threaded server that forks on request and inherits no unnecessary resources; spawn starts a fresh interpreter that inherits only what the process needs. Choosing fork explicitly reintroduces the deadlocks the defaults moved away from.

## Bad

```python
import multiprocessing


def work(value: int) -> None:
    print(value)


if __name__ == "__main__":
    context = multiprocessing.get_context("fork")
    with context.Pool(2) as pool:
        pool.map(work, [1, 2])
```

## Good

```python
import multiprocessing


def work(value: int) -> None:
    print(value)


if __name__ == "__main__":
    context = multiprocessing.get_context("spawn")
    with context.Pool(2) as pool:
        pool.map(work, [1, 2])
```

## See Also

- [python-conc-main-guard](conc-main-guard.md) - the guard that spawn and forkserver require
- [python-conc-process-picklable](conc-process-picklable.md) - the argument rule that follows from spawn
