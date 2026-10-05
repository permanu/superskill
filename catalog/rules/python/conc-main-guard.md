---
id: python-conc-main-guard
lang: python
prefix: conc
title: Guard the entry point with __main__ when children import it
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [__main__, multiprocessing, spawn, guard]
  files: ["**/*.py"]
  symbols: [__name__]
related: [python-conc-spawn-safety, python-conc-pool-context]
sources:
  - title: multiprocessing - Process-based parallelism
    url: https://docs.python.org/3/library/multiprocessing.html
---

> Guard the entry point with __main__; spawn and forkserver children import the main module.

## Why

The multiprocessing docs state that the package requires the __main__ module to be importable by children, and their examples place process creation inside the if __name__ == "__main__" clause for that reason. The concurrent.futures docs repeat that the __main__ module must be importable by worker subprocesses and that the executor will not work in the interactive interpreter. Without the guard, a child re-importing the module runs the pool setup again and spawns workers recursively.

## Bad

```python
import multiprocessing


def work(value: int) -> int:
    return value * value


with multiprocessing.Pool(2) as pool:
    print(pool.map(work, [1, 2, 3]))
```

## Good

```python
import multiprocessing


def work(value: int) -> int:
    return value * value


if __name__ == "__main__":
    with multiprocessing.Pool(2) as pool:
        print(pool.map(work, [1, 2, 3]))
```

## See Also

- [python-conc-spawn-safety](conc-spawn-safety.md) - the start methods that need this guard
- [python-conc-pool-context](conc-pool-context.md) - closing the pool inside the guard
