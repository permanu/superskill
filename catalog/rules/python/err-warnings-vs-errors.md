---
id: python-err-warnings-vs-errors
lang: python
prefix: err
title: Warn about recoverable conditions and raise for conditions that must stop the operation
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [warnings, deprecation, raise, recoverable]
  files: ["**/*.py"]
  symbols: [warnings.warn, DeprecationWarning]
related: [python-err-logging-exception]
sources:
  - title: warnings - Warning control
    url: https://docs.python.org/3/library/warnings.html
---

> Warn about recoverable conditions; raise for conditions that must stop the operation.

## Why

Warnings alert callers without changing control flow, and applications can filter them or promote them to errors deliberately. Raising for a condition that has a valid fallback breaks callers who can proceed, while staying silent hides the condition entirely. Deprecations, ignored fallbacks, and suspicious values are warnings; an operation that cannot produce a correct result raises an exception.

## Bad

```python
def connect(host: str, legacy_tls: bool = False) -> object:
    if legacy_tls:
        raise RuntimeError("legacy_tls is deprecated")
    return object()
```

## Good

```python
import warnings


def connect(host: str, legacy_tls: bool = False) -> object:
    if legacy_tls:
        warnings.warn(
            "legacy_tls is deprecated; migrate to the current TLS options",
            DeprecationWarning,
            stacklevel=2,
        )
    return object()
```

## See Also

- [python-err-logging-exception](err-logging-exception.md) - `logging.captureWarnings` routes warnings into the logging pipeline
