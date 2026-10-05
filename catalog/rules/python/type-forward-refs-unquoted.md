---
id: python-type-forward-refs-unquoted
lang: python
prefix: type
title: Write forward references unquoted now that annotations are deferred
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [forward reference, annotation, quotes, deferred]
  files: ["**/*.py"]
  symbols: [annotationlib]
related: [python-type-annotate-signatures]
sources:
  - title: What's New in Python - Deferred evaluation of annotations
    url: https://docs.python.org/3/whatsnew/3.14.html
  - title: typing - Type aliases
    url: https://docs.python.org/3/library/typing.html
---

> Write forward references unquoted; deferred annotations no longer require string literals.

## Why

Annotations are no longer evaluated eagerly, so a class can refer to itself or to a name defined later without wrapping it in quotes. Quoted annotations are now a second spelling that tools must unwind, and they hide the real type from readers and from runtime introspection helpers. Write the name directly and let evaluation happen when the annotation is requested.

## Bad

```python
class Tree:
    def __init__(self, left: "Tree | None" = None) -> None:
        self.left = left
```

## Good

```python
class Tree:
    def __init__(self, left: Tree | None = None) -> None:
        self.left = left
```

## See Also

- [python-type-annotate-signatures](type-annotate-signatures.md) - the annotation discipline this spelling belongs to
