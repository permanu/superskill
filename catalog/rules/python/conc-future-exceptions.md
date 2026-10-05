---
id: python-conc-future-exceptions
lang: python
prefix: conc
title: Retrieve future results so task exceptions surface
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Future, result, exceptions, executors]
  files: ["**/*.py"]
  symbols: [concurrent.futures.Future.result]
related: [python-async-task-retrieve, python-conc-pool-context]
sources:
  - title: concurrent.futures - Launching parallel tasks
    url: https://docs.python.org/3/library/concurrent.futures.html
---

> Call result() on every future; a task's exception stays inside the future until it is retrieved.

## Why

The concurrent.futures docs state that if the call raised an exception, Future.result() will raise the same exception, and that map() raises a task's exception when its value is retrieved from the iterator. A submitted task that fails and is never collected reports nothing, so the batch looks successful while work is missing. Retrieving the result is what transfers the failure to the caller.

## Bad

```python
from concurrent.futures import ThreadPoolExecutor


def work(value: int) -> int:
    if value < 0:
        raise ValueError(value)
    return value


with ThreadPoolExecutor() as executor:
    future = executor.submit(work, -1)
    print("submitted")
```

## Good

```python
from concurrent.futures import ThreadPoolExecutor


def work(value: int) -> int:
    if value < 0:
        raise ValueError(value)
    return value


with ThreadPoolExecutor() as executor:
    future = executor.submit(work, -1)
    try:
        print(future.result())
    except ValueError as error:
        print(f"task failed: {error}")
```

## See Also

- [python-async-task-retrieve](async-task-retrieve.md) - the asyncio equivalent of collecting failures
- [python-conc-pool-context](conc-pool-context.md) - shutting the pool down after collecting results
