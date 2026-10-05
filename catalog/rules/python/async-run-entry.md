---
id: python-async-run-entry
lang: python
prefix: async
title: Run async programs through one asyncio.run call instead of managing loops manually
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [asyncio.run, entry point, event loop, Runner]
  files: ["**/*.py"]
  symbols: [asyncio.run, run_until_complete]
related: [python-async-no-global-loop]
sources:
  - title: asyncio - Runners
    url: https://docs.python.org/3/library/asyncio-runner.html
  - title: asyncio - Coroutines and Tasks
    url: https://docs.python.org/3/library/asyncio-task.html
---

> Run async programs with a single asyncio.run call; it owns loop setup and shutdown.

## Why

`asyncio.run` creates the loop, finalizes async generators, shuts down the executor, and closes the loop, and the Runner installs SIGINT handling that unwinds through task cancellation. Manual loop management duplicates those steps and leaks the loop whenever an exception escapes. One entry point per program keeps startup and shutdown in one place.

## Bad

```python
import asyncio


async def main() -> None:
    await asyncio.sleep(0)


loop = asyncio.new_event_loop()
try:
    loop.run_until_complete(main())
finally:
    loop.close()
```

## Good

```python
import asyncio


async def main() -> None:
    await asyncio.sleep(0)


asyncio.run(main())
```

## See Also

- [python-async-no-global-loop](async-no-global-loop.md) - why code inside the program must not cache the loop this creates
