---
id: python-perf-profile-first
lang: python
prefix: perf
title: Measure before optimizing because the hot path is rarely where it looks
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [profile, measure, optimize, hotspot]
  files: ["**/*.py"]
  symbols: [cProfile, timeit]
related: [python-perf-cprofile-hotspots, python-perf-timeit-benchmark]
sources:
  - title: The Python Profilers - Introduction
    url: https://docs.python.org/3/library/profile.html
  - title: timeit - Measure execution time of small code snippets
    url: https://docs.python.org/3/library/timeit.html
---

> Measure before optimizing; the hot path is rarely where it looks.

## Why

Performance work without measurement spends effort on code that does not dominate the runtime and adds complexity for no gain. Profilers exist to attribute time to functions, and `timeit` exists to compare small alternatives. Optimize the measured hotspot, then re-measure to prove the change helped.

## Bad

```python
def normalize(rows: list[str]) -> list[str]:
    n = len(rows)
    out: list[str | None] = [None] * n
    i = 0
    while i < n:
        out[i] = rows[i].strip().lower()
        i += 1
    return [row for row in out if row is not None]
```

## Good

```python
import cProfile


def normalize(rows: list[str]) -> list[str]:
    return [row.strip().lower() for row in rows]


def main() -> None:
    rows = ["  A  ", " B "] * 1000
    cProfile.runctx("normalize(rows)", globals(), locals(), sort="cumulative")
```

## See Also

- [python-perf-cprofile-hotspots](perf-cprofile-hotspots.md) - reading profile output to find the hotspot
- [python-perf-timeit-benchmark](perf-timeit-benchmark.md) - comparing two candidate implementations
