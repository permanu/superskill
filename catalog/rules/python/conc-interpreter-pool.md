---
id: python-conc-interpreter-pool
lang: python
prefix: conc
title: Use InterpreterPoolExecutor for CPU-bound work that needs no shared state
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [InterpreterPoolExecutor, GIL, CPU, parallel]
  files: ["**/*.py"]
  symbols: [concurrent.futures.InterpreterPoolExecutor]
related: [python-async-offload-cpu]
sources:
  - title: concurrent.futures - Launching parallel tasks
    url: https://docs.python.org/3/library/concurrent.futures.html
---

> Use InterpreterPoolExecutor for CPU-bound work; each interpreter has its own GIL.

## Why

The concurrent.futures docs state that the biggest benefit of interpreters over threads is true multi-core parallelism, because each interpreter has its own Global Interpreter Lock, and that interpreter workers are isolated so mutable objects cannot be shared between them. That isolation is the trade: tasks must exchange copies, and the docs note the extra effort that deliberate sharing takes. For CPU-bound work that already passes data by value, the executor removes the GIL serialization that plain threads suffer.

## Bad

```python
from concurrent.futures import ThreadPoolExecutor


def crunch(data: list[int]) -> int:
    return sum(x * x for x in data)


with ThreadPoolExecutor() as executor:
    print(list(executor.map(crunch, [[1, 2], [3, 4]])))
```

## Good

```python
from concurrent.futures import InterpreterPoolExecutor


def crunch(data: list[int]) -> int:
    return sum(x * x for x in data)


with InterpreterPoolExecutor() as executor:
    print(list(executor.map(crunch, [[1, 2], [3, 4]])))
```

## See Also

- [python-async-offload-cpu](async-offload-cpu.md) - the asyncio-side version of this choice
