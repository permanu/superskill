---
id: python-const-sentinel-object
lang: python
prefix: const
title: Distinguish "not provided" with a unique sentinel object
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sentinel, object, defaults, None]
  files: ["**/*.py"]
  symbols: [object]
related: [python-anti-mutable-default, python-api-keyword-only]
sources:
  - title: functools - Higher-order functions
    url: https://docs.python.org/3/library/functools.html
---

> Use a module-level object() sentinel when None is a valid argument value.

## Why

The functools docs' reduce implementation uses a module-level sentinel, initial_missing = object(), precisely because None can be a legitimate value and cannot double as "not provided". Comparing with is against a unique object distinguishes the two cases that a None default conflates. The sentinel also survives pickling and equality checks that a string marker would not.

## Bad

```python
def set_value(key: str, value: str | None = None) -> None:
    if value is None:
        print("unchanged", key)
    else:
        print(key, value)
```

## Good

```python
_MISSING = object()


def set_value(key: str, value: str | None = _MISSING) -> None:
    if value is _MISSING:
        print("unchanged", key)
    else:
        print(key, value)
```

## See Also

- [python-anti-mutable-default](anti-mutable-default.md) - the other default-value trap
- [python-api-keyword-only](api-keyword-only.md) - making the sentinel parameter explicit at call sites
