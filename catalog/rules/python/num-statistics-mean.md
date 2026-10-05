---
id: python-num-statistics-mean
lang: python
prefix: num
title: Compute means with statistics.mean, not sum over len
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mean, statistics, average, summary]
  files: ["**/*.py"]
  symbols: [statistics.mean]
related: [python-num-math-fsum, python-num-fractions-exact]
sources:
  - title: statistics - Mathematical statistics functions
    url: https://docs.python.org/3/library/statistics.html
---

> Compute means with statistics.mean; the hand-rolled form divides by zero and loses type information.

## Why

The statistics docs define mean as the sample arithmetic mean of a sequence or iterable, state that StatisticsError is raised for empty input, and show Fraction and Decimal inputs producing exact results. A hand-rolled sum over len divides by zero on empty data and converts exact types to float along the way. The module function also documents which numeric types it supports.

## Bad

```python
def mean(values: list[float]) -> float:
    return sum(values) / len(values)
```

## Good

```python
import statistics


def mean(values: list[float]) -> float:
    return statistics.mean(values)
```

## See Also

- [python-num-math-fsum](num-math-fsum.md) - the accurate-sum building block
- [python-num-fractions-exact](num-fractions-exact.md) - the exact types mean() preserves
