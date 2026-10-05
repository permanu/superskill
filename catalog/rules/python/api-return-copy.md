---
id: python-api-return-copy
lang: python
prefix: api
title: Return a copy of internal mutable state, not the live object
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [encapsulation, copy, mutable state, api]
  files: ["**/*.py"]
  symbols: [list.copy, dict.copy]
related: [python-mem-copy-shallow-default]
sources:
  - title: copy - Shallow and deep copy operations
    url: https://docs.python.org/3/library/copy.html
---

> Return a copy of internal mutable state; returning the attribute lets callers mutate behind the API.

## Why

The copy docs start from the fact that assignment binds a name to an object rather than copying it, and list list.copy() and dict.copy() among the shallow-copy methods for collections. Returning an internal list hands the caller the same object the class mutates, so the class can no longer control its invariants. Returning a copy keeps the caller's view and the class's state independent.

## Bad

```python
class Playlist:
    def __init__(self) -> None:
        self._tracks: list[str] = []

    def add(self, track: str) -> None:
        self._tracks.append(track)

    def tracks(self) -> list[str]:
        return self._tracks
```

## Good

```python
class Playlist:
    def __init__(self) -> None:
        self._tracks: list[str] = []

    def add(self, track: str) -> None:
        self._tracks.append(track)

    def tracks(self) -> list[str]:
        return self._tracks.copy()
```

## See Also

- [python-mem-copy-shallow-default](mem-copy-shallow-default.md) - choosing the shallow copy in the first place
