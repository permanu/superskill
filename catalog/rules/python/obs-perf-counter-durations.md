---
id: python-obs-perf-counter-durations
lang: python
prefix: obs
title: Measure durations with time.perf_counter, not time.time
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [perf_counter, latency, duration, clock]
  files: ["**/*.py"]
  symbols: [time.perf_counter, time.time]
related: [python-perf-timeit-benchmark]
sources:
  - title: time - perf_counter
    url: https://docs.python.org/3/library/time.html
---

> Measure durations with time.perf_counter; time.time can jump backward.

## Why

`perf_counter` is documented as the highest-resolution clock for short durations, and on CPython it is monotonic. `time.time` follows the system clock and can move backward when it is set or adjusted, producing negative or inflated latency values in logs and metrics. The reference point of `perf_counter` is undefined, which is exactly right for differences.

## Bad

```python
import time


def handle() -> float:
    start = time.time()
    sum(range(1000))
    return time.time() - start
```

## Good

```python
import time


def handle() -> float:
    start = time.perf_counter()
    sum(range(1000))
    return time.perf_counter() - start
```

## See Also

- [python-perf-timeit-benchmark](perf-timeit-benchmark.md) - benchmarking that builds on the same clock
