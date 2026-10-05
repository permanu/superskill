---
id: python-type-never-noreturn
lang: python
prefix: type
title: Type functions that never return as Never
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Never, NoReturn, bottom type, typing]
  files: ["**/*.py"]
  symbols: [typing.Never, typing.NoReturn]
related: [python-type-self-return]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
---

> Type functions that never return as Never; None says the function falls off the end.

## Why

The typing docs state that Never and NoReturn represent the bottom type, a type that has no members, and that they can be used to indicate that a function never returns, with sys.exit as the example. Annotating a raising helper as None tells readers and checkers that a normal return is possible, so code after the call is not treated as unreachable. The bottom type also composes with exhaustiveness checks over unions.

## Bad

```python
def stop() -> None:
    raise RuntimeError("stop")
```

## Good

```python
from typing import Never


def stop() -> Never:
    raise RuntimeError("stop")
```

## See Also

- [python-type-self-return](type-self-return.md) - the other special return annotation
