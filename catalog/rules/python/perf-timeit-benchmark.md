---
id: python-perf-timeit-benchmark
lang: python
prefix: perf
title: Benchmark small changes with timeit and compare the best of repeated runs
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [timeit, benchmark, repeat, perf_counter]
  files: ["**/*.py"]
  symbols: [timeit.repeat, time.perf_counter]
related: [python-perf-profile-first]
sources:
  - title: timeit - Measure execution time of small code snippets
    url: https://docs.python.org/3/library/timeit.html
---

> Benchmark small changes with timeit and compare the best of repeated runs.

## Why

`timeit` avoids the common traps of hand-timed snippets: it picks the repetition count, uses a monotonic high-resolution timer, and disables garbage collection during the timing. Repeat the measurement and compare the minimum, because higher values come from other processes interfering rather than from the code. A single `time.time()` delta measures noise as much as work.

## Bad

```python
import time
from collections.abc import Callable


def measure(build: Callable[[], None]) -> float:
    start = time.time()
    build()
    return time.time() - start
```

## Good

```python
import timeit
from collections.abc import Callable


def measure(build: Callable[[], None]) -> float:
    results = timeit.repeat(build, number=1000, repeat=5)
    return min(results)
```

## See Also

- [python-perf-profile-first](perf-profile-first.md) - choosing the workload worth benchmarking
