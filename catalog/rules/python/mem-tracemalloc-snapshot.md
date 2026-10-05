---
id: python-mem-tracemalloc-snapshot
lang: python
prefix: mem
title: Locate memory growth with tracemalloc snapshots compared per line
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [memory, leak, tracemalloc, snapshot]
  files: ["**/*.py"]
  symbols: [tracemalloc.take_snapshot, tracemalloc.compare_to]
related: [python-perf-cprofile-hotspots]
sources:
  - title: tracemalloc - Trace memory allocations
    url: https://docs.python.org/3/library/tracemalloc.html
---

> Measure growth with tracemalloc snapshots compared per line; a single process total shows only that memory grew.

## Why

The tracemalloc docs describe the module as a debug tool that records the traceback where a memory block was allocated and computes the differences between two snapshots to detect memory leaks. Its statistics group allocated blocks by filename and line number, so a report points at the allocating code. A single process-level total shows that memory grew but not which allocation caused it.

## Bad

```python
import resource


def used_mb() -> float:
    usage = resource.getrusage(resource.RUSAGE_SELF)
    return usage.ru_maxrss / 1024
```

## Good

```python
import tracemalloc


def leak_report() -> None:
    tracemalloc.start()
    before = tracemalloc.take_snapshot()
    data = [bytearray(1000) for _ in range(100)]
    after = tracemalloc.take_snapshot()
    for stat in after.compare_to(before, "lineno")[:3]:
        print(stat)
    del data
    tracemalloc.stop()
```

## See Also

- [python-perf-cprofile-hotspots](perf-cprofile-hotspots.md) - the same snapshot-and-compare discipline for time instead of memory
