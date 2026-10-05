---
id: python-type-union-pipe
lang: python
prefix: type
title: Write unions as X | Y and optional values as X | None
severity: should
enforce: tool
tool: ruff:UP007
baseline: latest
status: verified
triggers:
  keywords: [union, Optional, pipe, annotations]
  files: ["**/*.py"]
  symbols: [Union, Optional]
related: [python-type-builtin-generics]
sources:
  - title: PEP 604 - Allow writing union types as X | Y
    url: https://peps.python.org/pep-0604/
  - title: typing - Union and Optional
    url: https://docs.python.org/3/library/typing.html
  - title: Ruff UP007 - non-pep604-annotation-union
    url: https://docs.astral.sh/ruff/rules/non-pep604-annotation-union/
  - title: Ruff UP045 - non-pep604-annotation-optional
    url: https://docs.astral.sh/ruff/rules/non-pep604-annotation-optional/
---

> Write unions as X | Y and optional values as X | None.

## Why

The pipe form is the documented shorthand, reads like the data shape, and creates the same runtime union as `typing.Union`. `Optional[X]` hides the `None` member behind a name, while `X | None` states it where the reader looks. The aliases remain for compatibility but add nothing.

## Bad

```python
from typing import Optional, Union


def parse_id(raw: Union[str, int]) -> Optional[int]:
    try:
        return int(raw)
    except ValueError:
        return None
```

## Good

```python
def parse_id(raw: str | int) -> int | None:
    try:
        return int(raw)
    except ValueError:
        return None
```

## See Also

- [python-type-builtin-generics](type-builtin-generics.md) - the matching shorthand for container generics
