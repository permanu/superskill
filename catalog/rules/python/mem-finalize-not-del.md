---
id: python-mem-finalize-not-del
lang: python
prefix: mem
title: Register cleanup with weakref.finalize instead of __del__
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [finalizer, __del__, cleanup, weakref]
  files: ["**/*.py"]
  symbols: [weakref.finalize]
related: [python-mem-finalizer-call, python-mem-break-cycles]
sources:
  - title: weakref - Weak references
    url: https://docs.python.org/3/library/weakref.html
---

> Register cleanup with weakref.finalize instead of __del__; finalizers run once and do not depend on interpreter internals.

## Why

The weakref docs present finalize as a straight forward way to register a cleanup function that runs when an object is garbage collected, and note that handling of __del__ methods is implementation specific because it depends on internal details of the interpreter's garbage collector. A finalizer holds only the function and arguments it was given, can be called explicitly, and invokes its callback at most once. The docs also warn that the callback's function and arguments must not reference the object, or it can never be collected.

## Bad

```python
class Connection:
    def __init__(self, handle: str) -> None:
        self.handle = handle

    def __del__(self) -> None:
        print(f"releasing {self.handle}")
```

## Good

```python
import weakref


class Connection:
    def __init__(self, handle: str) -> None:
        self.handle = handle
        self._finalizer = weakref.finalize(self, Connection._release, handle)

    @staticmethod
    def _release(handle: str) -> None:
        print(f"releasing {handle}")
```

## See Also

- [python-mem-finalizer-call](mem-finalizer-call.md) - releasing explicitly without double cleanup
- [python-mem-break-cycles](mem-break-cycles.md) - why cycles delay collection in the first place
