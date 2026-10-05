---
id: python-perf-cprofile-hotspots
lang: python
prefix: perf
title: Profile with cProfile and read cumulative time before optimizing
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cProfile, profile, hotspots, cumulative]
  files: ["**/*.py"]
  symbols: [cProfile.Profile, SortKey]
related: [python-perf-profile-first]
sources:
  - title: The Python Profilers
    url: https://docs.python.org/3/library/profile.html
---

> Profile with cProfile and read cumulative time before optimizing.

## Why

cProfile records call counts and both per-function and cumulative time, so it shows which functions dominate and which callers are responsible. Cumulative time identifies algorithm-level mistakes, while internal time identifies hot loops worth tuning. Timing a whole run by hand only says that something is slow.

## Bad

```python
import time


def slow_report(rows: list[dict[str, int]]) -> int:
    start = time.perf_counter()
    total = 0
    for row in rows:
        for key in row:
            total += len(key)
    print(f"took {time.perf_counter() - start:.3f}s")
    return total
```

## Good

```python
import cProfile
from pstats import SortKey


def slow_report(rows: list[dict[str, int]]) -> int:
    total = 0
    for row in rows:
        for key in row:
            total += len(key)
    return total


def profile(rows: list[dict[str, int]]) -> None:
    with cProfile.Profile() as profiler:
        slow_report(rows)
    profiler.print_stats(SortKey.CUMULATIVE)
```

## See Also

- [python-perf-profile-first](perf-profile-first.md) - the measurement decision this profiling serves
