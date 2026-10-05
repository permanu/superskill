---
id: python-async-no-global-loop
lang: python
prefix: async
title: Resolve the running event loop per call instead of caching one globally
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [event loop, get_running_loop, global, cache]
  files: ["**/*.py"]
  symbols: [get_running_loop, new_event_loop]
related: [python-async-run-entry]
sources:
  - title: asyncio - Runners
    url: https://docs.python.org/3/library/asyncio-runner.html
  - title: asyncio - Coroutines and Tasks
    url: https://docs.python.org/3/library/asyncio-task.html
---

> Resolve the event loop per call with get_running_loop; never cache one globally.

## Why

`asyncio.run` creates a fresh loop and closes it at the end, so a cached loop goes stale or closed and later calls fail intermittently depending on which entry point ran first. `get_running_loop` returns the loop of the current thread and task context, which is always the right one. Store nothing about the loop between calls.

## Bad

```python
import asyncio

LOOP = asyncio.new_event_loop()


async def stamp() -> float:
    return LOOP.time()
```

## Good

```python
import asyncio


async def stamp() -> float:
    loop = asyncio.get_running_loop()
    return loop.time()
```

## See Also

- [python-async-run-entry](async-run-entry.md) - the entry point that owns loop creation and shutdown
