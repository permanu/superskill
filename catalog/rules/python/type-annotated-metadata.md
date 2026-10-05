---
id: python-type-annotated-metadata
lang: python
prefix: type
title: Attach context to annotations with Annotated instead of naming conventions
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Annotated, metadata, annotations, units]
  files: ["**/*.py"]
  symbols: [typing.Annotated]
related: [python-type-annotate-signatures]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
---

> Attach context to annotations with Annotated; tools read the metadata and checkers still see the type.

## Why

The typing docs describe Annotated as a special typing form to add context-specific metadata to an annotation, stored at runtime in a __metadata__ attribute, and state that a library without special logic for the metadata should ignore it and treat the annotation as the plain type. Type checkers keep checking the underlying type while validators and documentation tools can read the metadata. A type alias of Annotated names the constraint once for the whole codebase.

## Bad

```python
def scale(value: int, factor: int) -> int:
    return value * factor
```

## Good

```python
from typing import Annotated

Pixels = Annotated[int, "pixels"]


def scale(value: Pixels, factor: int) -> int:
    return value * factor
```

## See Also

- [python-type-annotate-signatures](type-annotate-signatures.md) - annotating the parameters in the first place
