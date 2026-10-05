---
id: python-mem-array-compact
lang: python
prefix: mem
title: Store large homogeneous numeric buffers in array.array instead of lists
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [memory, array, numeric, buffer]
  files: ["**/*.py"]
  symbols: [array.array]
related: [python-mem-tracemalloc-snapshot]
sources:
  - title: array - Efficient arrays of numeric values
    url: https://docs.python.org/3/library/array.html
---

> Store large homogeneous numeric buffers in array.array; a list boxes every number in its own object.

## Why

The array docs describe the type as a compact representation of basic values that behaves like a list except that the type of objects stored is constrained. A list holds one pointer per element plus a separately allocated Python object for each number, while an array keeps the values themselves in one buffer whose per-item size the docs expose as itemsize. The tradeoff is that the element type is fixed at creation, so an array fits large homogeneous buffers rather than general collections.

## Bad

```python
def load_samples(raw: bytes) -> list[float]:
    return [float(value) for value in raw.split(b",")]
```

## Good

```python
from array import array


def load_samples(raw: bytes) -> array[float]:
    return array("d", (float(value) for value in raw.split(b",")))
```

## See Also

- [python-mem-tracemalloc-snapshot](mem-tracemalloc-snapshot.md) - measuring the buffer before changing its representation
