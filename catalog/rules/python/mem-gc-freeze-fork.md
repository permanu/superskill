---
id: python-mem-gc-freeze-fork
lang: python
prefix: mem
title: Freeze the garbage collector before forking a long-lived server process
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fork, copy-on-write, gc.freeze, multiprocessing]
  files: ["**/*.py"]
  symbols: [gc.freeze, multiprocessing.get_context]
related: [python-mem-break-cycles]
sources:
  - title: gc - Garbage Collector interface
    url: https://docs.python.org/3/library/gc.html
---

> Freeze the collector before fork; children then leave the parent's long-lived objects alone and share their pages.

## Why

The gc docs state that a process which forks without exec should avoid unnecessary copy-on-write so child processes share the parent's memory pages, and that this requires GC collections in children not to touch the gc_refs counters of long-lived objects originating in the parent. Their prescription is to disable the collector early in the parent, freeze it right before the fork, and enable it early in each child. Freeze is the pre-fork step: it moves all tracked objects to a permanent generation that future collections ignore.

## Bad

```python
import multiprocessing


def start_workers(jobs: list[int]) -> list[int]:
    context = multiprocessing.get_context("fork")
    with context.Pool(4) as pool:
        return pool.map(abs, jobs)
```

## Good

```python
import gc
import multiprocessing


def start_workers(jobs: list[int]) -> list[int]:
    gc.freeze()
    context = multiprocessing.get_context("fork")
    with context.Pool(4) as pool:
        return pool.map(abs, jobs)
```

## See Also

- [python-mem-break-cycles](mem-break-cycles.md) - how cycles reach the collector in the first place
