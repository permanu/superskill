---
id: python-err-context-manager-cleanup
lang: python
prefix: err
title: Manage every resource with a with statement so release runs on all exit paths
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [with, resource, cleanup, leak, close]
  files: ["**/*.py"]
  symbols: [open, contextmanager]
related: [python-err-finally-no-control-flow]
sources:
  - title: Python Tutorial - Predefined Clean-up Actions
    url: https://docs.python.org/3/tutorial/errors.html
  - title: contextlib - Utilities for with-statement contexts
    url: https://docs.python.org/3/library/contextlib.html
---

> Manage resources with with statements so release runs on success, failure, and unwind.

## Why

Manual acquire/release pairs leak when the code between them raises or returns early. The `with` statement guarantees release on every exit path, including exceptions, and keeps acquisition and release in one statement that reviewers can see. Resources without context-manager support are wrapped with `contextlib.contextmanager` or closed with `contextlib.closing`.

## Bad

```python
def write_summary(path: str, lines: list[str]) -> None:
    handle = open(path, "w", encoding="utf-8")
    handle.write("\n".join(lines))
    handle.close()
```

## Good

```python
def write_summary(path: str, lines: list[str]) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))
```

## See Also

- [python-err-finally-no-control-flow](err-finally-no-control-flow.md) - the control-flow trap that `with` exists to avoid
