---
id: python-perf-generator-stream
lang: python
prefix: perf
title: Stream with generator expressions instead of materializing intermediate lists
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generator, stream, lazy, memory]
  files: ["**/*.py"]
  symbols: [sum, Generator]
related: [python-perf-comprehension-build]
sources:
  - title: Functional Programming HOWTO - Generator expressions
    url: https://docs.python.org/3/howto/functional.html
---

> Stream with generator expressions instead of materializing intermediate lists.

## Why

A generator expression computes each value as the consumer asks for it, so no intermediate list is allocated and the pipeline can start before the input is exhausted. The howto states the preference for large or infinite data explicitly. Use a list comprehension only when the result itself is the deliverable.

## Bad

```python
def total_length(lines: list[str]) -> int:
    stripped = [line.strip() for line in lines]
    return sum(len(line) for line in stripped)
```

## Good

```python
def total_length(lines: list[str]) -> int:
    return sum(len(line.strip()) for line in lines)
```

## See Also

- [python-perf-comprehension-build](perf-comprehension-build.md) - when the materialized list is the right output
