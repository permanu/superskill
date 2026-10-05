---
id: python-mem-bounded-deque
lang: python
prefix: mem
title: Bound rolling history buffers with a deque maxlen
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deque, maxlen, history, memory]
  files: ["**/*.py"]
  symbols: [collections.deque]
related: [python-perf-deque-endpoints]
sources:
  - title: collections - Container datatypes
    url: https://docs.python.org/3/library/collections.html
---

> Bound recent-history buffers with a deque maxlen; an untrimmed list grows for the life of the process.

## Why

The collections docs state that a deque created with maxlen is bounded to that length and that adding to a full deque discards a corresponding number of items from the opposite end. A list used as a rolling history has no such bound, so keeping it capped is separate code that every append path must run. maxlen makes the cap a property of the container instead of a discipline.

## Bad

```python
_recent: list[str] = []


def record(event: str) -> None:
    _recent.append(event)
```

## Good

```python
from collections import deque

_recent: deque[str] = deque(maxlen=1000)


def record(event: str) -> None:
    _recent.append(event)
```

## See Also

- [python-perf-deque-endpoints](perf-deque-endpoints.md) - the O(1) ends that make deque the queue of choice
