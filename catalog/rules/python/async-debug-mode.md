---
id: python-async-debug-mode
lang: python
prefix: async
title: Turn on asyncio debug mode during development
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [debug mode, PYTHONASYNCIODEBUG, set_debug, un-awaited]
  files: ["**/*.py"]
  symbols: [asyncio.AbstractEventLoop.set_debug]
related: [python-async-await-coroutines, python-obs-dictconfig]
sources:
  - title: Developing with asyncio
    url: https://docs.python.org/3/library/asyncio-dev.html
---

> Enable asyncio debug mode in development; slow callbacks are logged and stray coroutines gain creation tracebacks.

## Why

The asyncio development docs list the ways to enable debug mode — PYTHONASYNCIODEBUG=1, the Python Development Mode, debug=True on asyncio.run, or loop.set_debug() — and what it adds: callbacks taking longer than 100 milliseconds are logged, slow I/O selector time is reported, and non-threadsafe APIs called from the wrong thread raise. The never-awaited coroutine RuntimeWarning is emitted without debug mode, but debug mode adds the traceback showing where the coroutine was created. The same section recommends raising the asyncio logger to DEBUG and displaying ResourceWarning while developing.

## Bad

```python
import asyncio


async def main() -> None:
    print("run")


asyncio.run(main())
```

## Good

```python
import asyncio


async def main() -> None:
    asyncio.get_running_loop().set_debug(True)
    print("run")


asyncio.run(main())
```

## See Also

- [python-async-await-coroutines](async-await-coroutines.md) - awaiting every coroutine you create
- [python-obs-dictconfig](obs-dictconfig.md) - configuring the logging that receives debug-mode warnings
