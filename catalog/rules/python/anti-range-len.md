---
id: python-anti-range-len
lang: python
prefix: anti
title: Iterate with enumerate instead of indexing through range and len
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enumerate, range, loop, index]
  files: ["**/*.py"]
  symbols: [enumerate]
related: [python-perf-comprehension-build, python-perf-deque-endpoints]
sources:
  - title: The Python Tutorial - More Control Flow Tools
    url: https://docs.python.org/3/tutorial/controlflow.html
---

> Iterate with enumerate; range and len index the sequence when it can yield values directly.

## Why

The tutorial shows range(len(a)) for index iteration and then notes that in most such cases it is convenient to use the enumerate() function. enumerate yields the index and the value together, so the indexing expression disappears. The loop body then works on values instead of positions.

## Bad

```python
def label_all(names: list[str]) -> list[str]:
    labels = []
    for index in range(len(names)):
        labels.append(f"{index}: {names[index]}")
    return labels
```

## Good

```python
def label_all(names: list[str]) -> list[str]:
    return [f"{index}: {name}" for index, name in enumerate(names)]
```

## See Also

- [python-perf-comprehension-build](perf-comprehension-build.md) - building the result with a comprehension
- [python-perf-deque-endpoints](perf-deque-endpoints.md) - choosing the right container for the traversal
