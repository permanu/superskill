---
id: python-async-aclosing-generators
lang: python
prefix: async
title: Close async generators deterministically with contextlib.aclosing when leaving early
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [async generator, aclosing, cleanup, break]
  files: ["**/*.py"]
  symbols: [aclosing, aclose]
related: [python-err-context-manager-cleanup]
sources:
  - title: contextlib - aclosing
    url: https://docs.python.org/3/library/contextlib.html
---

> Close async generators with contextlib.aclosing when leaving early.

## Why

Breaking out of an `async for` loop or raising inside it leaves the generator suspended, and its exit code then runs later on the loop's finalizer in a different context. `aclosing` awaits `aclose` in the same task context, so cleanup sees the state it expects. This matters whenever the generator holds a connection, lock, or file.

## Bad

```python
async def values():
    yield 1
    yield 2


async def main() -> None:
    async for value in values():
        if value == 1:
            break
```

## Good

```python
from contextlib import aclosing


async def values():
    yield 1
    yield 2


async def main() -> None:
    async with aclosing(values()) as stream:
        async for value in stream:
            if value == 1:
                break
```

## See Also

- [python-err-context-manager-cleanup](err-context-manager-cleanup.md) - the synchronous version of deterministic release
