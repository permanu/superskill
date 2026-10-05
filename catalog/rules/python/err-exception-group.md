---
id: python-err-exception-group
lang: python
prefix: err
title: Handle grouped failures with except* so each error type is matched and the rest still propagate
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ExceptionGroup, except, TaskGroup, structured]
  files: ["**/*.py"]
  symbols: [ExceptionGroup, except*]
related: [python-err-asyncio-cancel, python-err-custom-hierarchy]
sources:
  - title: PEP 654 - Exception Groups and except*
    url: https://peps.python.org/pep-0654/
  - title: Python Tutorial - Raising and Handling Multiple Unrelated Exceptions
    url: https://docs.python.org/3/tutorial/errors.html
  - title: asyncio - Task groups
    url: https://docs.python.org/3/library/asyncio-task.html
---

> Handle concurrent failures with except* so each error type is matched and the rest still propagate.

## Why

Structured concurrency APIs report multiple failures as one `ExceptionGroup`, and a plain `except` sees only the wrapper. `except*` splits the group by type, runs each matching clause once, and re-raises whatever no clause matched, so no failure is silently dropped. Iterating the group to handle one leaf and discarding the rest deletes errors from the report.

## Bad

```python
import asyncio


async def main() -> None:
    try:
        async with asyncio.TaskGroup() as group:
            group.create_task(asyncio.sleep(0))
            group.create_task(asyncio.sleep(0))
    except Exception:
        return
```

## Good

```python
import asyncio
from collections.abc import Iterable


class JobFailed(Exception):
    pass


def report(errors: Iterable[BaseException]) -> None:
    failures = tuple(errors)
    print(f"{len(failures)} job(s) failed")


async def main() -> None:
    try:
        async with asyncio.TaskGroup() as group:
            group.create_task(asyncio.sleep(0))
            group.create_task(asyncio.sleep(0))
    except* JobFailed as exc_group:
        report(exc_group.exceptions)
```

## See Also

- [python-err-asyncio-cancel](err-asyncio-cancel.md) - the cancellation that task-group shutdown depends on
- [python-err-custom-hierarchy](err-custom-hierarchy.md) - the error types a group handler matches
