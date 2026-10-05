---
id: python-async-taskgroup-structured
lang: python
prefix: async
title: Group related concurrent work in a TaskGroup so failures cancel siblings and aggregate
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [TaskGroup, structured concurrency, cancel, ExceptionGroup]
  files: ["**/*.py"]
  symbols: [asyncio.TaskGroup]
related: [python-async-gather-inspect, python-err-exception-group]
sources:
  - title: asyncio - Task groups
    url: https://docs.python.org/3/library/asyncio-task.html
  - title: PEP 654 - Exception Groups and except*
    url: https://peps.python.org/pep-0654/
---

> Group related tasks in a TaskGroup so failures cancel siblings and aggregate.

## Why

A TaskGroup waits for every task it owns, cancels the rest when one fails, and raises their failures together as an exception group. Loose `create_task` calls keep running after a sibling fails and leave waiting and cleanup to the caller. The group's exit is the join point, so no task is left unobserved.

## Bad

```python
import asyncio


async def job(name: str) -> str:
    await asyncio.sleep(0)
    return name


async def main() -> None:
    tasks = [asyncio.create_task(job(name)) for name in ("a", "b")]
    results = [await task for task in tasks]
    print(results)
```

## Good

```python
import asyncio


async def job(name: str) -> str:
    await asyncio.sleep(0)
    return name


async def main() -> None:
    async with asyncio.TaskGroup() as group:
        first = group.create_task(job("a"))
        second = group.create_task(job("b"))
    print([first.result(), second.result()])
```

## See Also

- [python-async-gather-inspect](async-gather-inspect.md) - what gather does differently
- [python-err-exception-group](err-exception-group.md) - handling the group's combined failures
