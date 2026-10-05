---
id: python-perf-deque-endpoints
lang: python
prefix: perf
title: Use deque for O(1) operations at both ends because list.pop(0) is O(n)
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deque, queue, pop, appendleft, complexity]
  files: ["**/*.py"]
  symbols: [collections.deque, list.pop]
related: [python-async-queue-backpressure]
sources:
  - title: collections - deque objects
    url: https://docs.python.org/3/library/collections.html
  - title: Python Tutorial - Using Lists as Queues
    url: https://docs.python.org/3/tutorial/datastructures.html
---

> Use deque for O(1) operations at both ends; list.pop(0) is O(n).

## Why

A list stores elements contiguously, so removing or inserting at the front shifts every remaining element and costs O(n) per operation. `deque` is built for both ends and performs those operations in O(1). The tutorial names this exact case and points queue implementations at `collections.deque`.

## Bad

```python
def drain_first(queue: list[str]) -> list[str]:
    processed = []
    while queue:
        processed.append(queue.pop(0))
    return processed
```

## Good

```python
from collections import deque


def drain_first(queue: deque[str]) -> list[str]:
    processed = []
    while queue:
        processed.append(queue.popleft())
    return processed
```

## See Also

- [python-async-queue-backpressure](async-queue-backpressure.md) - the async equivalent for task pipelines
