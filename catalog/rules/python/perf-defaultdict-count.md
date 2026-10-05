---
id: python-perf-defaultdict-count
lang: python
prefix: perf
title: Count with defaultdict or Counter instead of get and setdefault loops
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [defaultdict, Counter, counting, setdefault]
  files: ["**/*.py"]
  symbols: [defaultdict, Counter]
related: [python-perf-set-membership]
sources:
  - title: collections - defaultdict and Counter
    url: https://docs.python.org/3/library/collections.html
---

> Count with defaultdict or Counter, not get/setdefault loops.

## Why

`defaultdict` supplies the missing zero through its factory, so the increment is a single indexed operation instead of a lookup, a default, and a store. `Counter` goes further and adds `most_common`, `total`, and multiset arithmetic. The docs call the `defaultdict` technique simpler and faster than the `setdefault` equivalent.

## Bad

```python
def word_counts(words: list[str]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for word in words:
        counts[word] = counts.get(word, 0) + 1
    return counts
```

## Good

```python
from collections import defaultdict


def word_counts(words: list[str]) -> dict[str, int]:
    counts: defaultdict[str, int] = defaultdict(int)
    for word in words:
        counts[word] += 1
    return dict(counts)
```

## See Also

- [python-perf-set-membership](perf-set-membership.md) - the companion container choice for lookups
