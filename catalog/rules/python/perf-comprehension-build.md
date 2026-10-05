---
id: python-perf-comprehension-build
lang: python
prefix: perf
title: Build transformed lists with comprehensions instead of append loops
severity: should
enforce: tool
tool: ruff:PERF401
baseline: latest
status: verified
triggers:
  keywords: [comprehension, append, loop, transform]
  files: ["**/*.py"]
  symbols: [list]
related: [python-perf-generator-stream]
sources:
  - title: Ruff PERF401 - manual-list-comprehension
    url: https://docs.astral.sh/ruff/rules/manual-list-comprehension/
  - title: Python Tutorial - List Comprehensions
    url: https://docs.python.org/3/tutorial/datastructures.html
---

> Build transformed lists with comprehensions, not append loops.

## Why

A comprehension states the transformation and the filter in one expression, so the loop variable, accumulator, and append call disappear. It also runs faster than the equivalent loop because the iteration stays in optimized bytecode. Use `extend` with a generator expression when appending to an existing list.

## Bad

```python
def squares(values: list[int]) -> list[int]:
    result = []
    for value in values:
        if value % 2:
            result.append(value * value)
    return result
```

## Good

```python
def squares(values: list[int]) -> list[int]:
    return [value * value for value in values if value % 2]
```

## See Also

- [python-perf-generator-stream](perf-generator-stream.md) - the lazy form when the list is never needed in full
