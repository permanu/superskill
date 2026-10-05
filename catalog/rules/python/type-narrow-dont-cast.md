---
id: python-type-narrow-dont-cast
lang: python
prefix: type
title: Narrow values with isinstance, TypeIs, or match and cast only after a proven invariant
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cast, isinstance, narrowing, TypeIs, match]
  files: ["**/*.py"]
  symbols: [cast, isinstance, TypeIs]
related: [python-type-ignore-coded]
sources:
  - title: Specification for the Python type system - Type narrowing
    url: https://typing.python.org/en/latest/spec/narrowing.html
  - title: Specification for the Python type system - Type checker directives
    url: https://typing.python.org/en/latest/spec/directives.html
  - title: typing - cast
    url: https://docs.python.org/3/library/typing.html
---

> Narrow values with isinstance, TypeIs, or match; cast only after a proven invariant.

## Why

`cast` returns the value unchanged: it checks nothing, converts nothing, and only silences the checker, so a wrong cast moves the failure to runtime. Narrowing constructs prove the same fact the code relies on and raise when the assumption breaks. A cast is defensible only where the invariant is already established, such as an index found by a search.

## Bad

```python
from typing import cast


def length(value: object) -> int:
    return len(cast(list[object], value))
```

## Good

```python
from collections.abc import Sized


def length(value: object) -> int:
    if not isinstance(value, Sized):
        raise TypeError(f"value has no length: {type(value).__name__}")
    return len(value)
```

## See Also

- [python-type-ignore-coded](type-ignore-coded.md) - the other way type errors get silenced, and how to scope it
