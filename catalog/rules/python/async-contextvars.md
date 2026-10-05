---
id: python-async-contextvars
lang: python
prefix: async
title: Keep per-task state in contextvars instead of module globals or thread locals
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [contextvars, ContextVar, task state, globals]
  files: ["**/*.py"]
  symbols: [ContextVar, contextvars]
related: [python-async-primitives]
sources:
  - title: contextvars - Context Variables
    url: https://docs.python.org/3/library/contextvars.html
  - title: asyncio - Task object
    url: https://docs.python.org/3/library/asyncio-task.html
---

> Keep per-task state in contextvars so concurrent tasks do not share it.

## Why

Each task runs with a copy of the context, so a `ContextVar` set inside a task stays local to it and is visible to the calls it awaits. Module globals and `threading.local` are shared across tasks on the same thread, so one request overwrites another's state. Declare the variable at module level and set it where the task begins.

## Bad

```python
current_user: str = ""


async def handle(user: str) -> str:
    global current_user
    current_user = user
    return await render()


async def render() -> str:
    return f"user={current_user}"
```

## Good

```python
from contextvars import ContextVar

current_user: ContextVar[str] = ContextVar("current_user", default="")


async def handle(user: str) -> str:
    current_user.set(user)
    return await render()


async def render() -> str:
    return f"user={current_user.get()}"
```

## See Also

- [python-async-primitives](async-primitives.md) - the complementary choice: synchronize shared state instead of isolating it
