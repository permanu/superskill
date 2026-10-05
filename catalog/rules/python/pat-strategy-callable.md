---
id: python-pat-strategy-callable
lang: python
prefix: pat
title: Pass behavior as a callable instead of subclassing for one method
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [strategy, callable, composition, subclass]
  files: ["**/*.py"]
  symbols: [Callable]
related: [python-pat-partial]
sources:
  - title: The Python Tutorial - More Control Flow Tools
    url: https://docs.python.org/3/tutorial/controlflow.html
---

> Pass behavior as a callable; a subclass that changes one method adds ceremony.

## Why

The tutorial shows functions passed as arguments, including the sort key function, and notes that lambda functions can be used wherever function objects are required. A strategy that is one callable needs no class: the caller passes the function and the code calls it. A subclass hierarchy for the same variation spreads one decision across several files and forces callers to pick a type instead of an argument.

## Bad

```python
class TextRenderer:
    def render(self, text: str) -> str:
        return text


class UpperRenderer(TextRenderer):
    def render(self, text: str) -> str:
        return text.upper()
```

## Good

```python
from collections.abc import Callable


def render(text: str, transform: Callable[[str], str]) -> str:
    return transform(text)
```

## See Also

- [python-pat-partial](pat-partial.md) - freezing part of a callable before passing it
