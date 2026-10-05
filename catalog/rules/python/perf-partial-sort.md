---
id: python-perf-partial-sort
lang: python
prefix: perf
title: Use heapq.nsmallest or nlargest for a top-n selection instead of a full sort
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [heapq, nlargest, nsmallest, top-n, sort]
  files: ["**/*.py"]
  symbols: [heapq.nlargest, heapq.nsmallest]
related: [python-perf-sort-key]
sources:
  - title: Sorting Techniques - Partial Sorts
    url: https://docs.python.org/3/howto/sorting.html
---

> Use heapq.nsmallest or nlargest for a top-n selection instead of a full sort.

## Why

Sorting the whole collection to keep a handful of entries does work proportional to the full input. The `heapq` selection functions make a single pass and keep only n elements, so they perform far fewer comparisons when n is small. Reach for `min` or `max` when n is one.

## Bad

```python
def top_scores(scores: list[int], count: int) -> list[int]:
    return sorted(scores, reverse=True)[:count]
```

## Good

```python
import heapq


def top_scores(scores: list[int], count: int) -> list[int]:
    return heapq.nlargest(count, scores)
```

## See Also

- [python-perf-sort-key](perf-sort-key.md) - making the comparisons themselves cheaper when a full sort is needed
