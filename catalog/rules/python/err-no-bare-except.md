---
id: python-err-no-bare-except
lang: python
prefix: err
title: Catch the narrowest exception type and never use a bare except
severity: must
enforce: tool
tool: ruff:BLE001
baseline: latest
status: verified
triggers:
  keywords: [except, bare, catch, broad, handler]
  files: ["**/*.py"]
  symbols: [BaseException, Exception]
related: [python-err-suppress-narrow, python-err-logging-exception]
sources:
  - title: Python Tutorial - Handling Exceptions
    url: https://docs.python.org/3/tutorial/errors.html
  - title: Built-in Exceptions - Base classes
    url: https://docs.python.org/3/library/exceptions.html
  - title: Google Python Style Guide - Exceptions
    url: https://google.github.io/styleguide/pyguide.html
  - title: Ruff BLE001 - blind-except
    url: https://docs.astral.sh/ruff/rules/blind-except/
---

> Catch the narrowest exception type; use a bare except nowhere.

## Why

A bare `except` catches `BaseException`, including `KeyboardInterrupt` and `SystemExit`, and it hides typos and other programming errors that would otherwise surface immediately. Specific handlers state which failure is expected and let everything else propagate. A broad handler is acceptable only when it immediately re-raises or records the failure at an isolation boundary, which is exactly what the linter recognizes.

## Bad

```python
import json


def load(raw: str) -> dict[str, object]:
    try:
        return json.loads(raw)
    except:
        return {}
```

## Good

```python
import json


def load(raw: str) -> dict[str, object]:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    if not isinstance(data, dict):
        raise TypeError(f"payload must be an object, got {type(data).__name__}")
    return data
```

## See Also

- [python-err-suppress-narrow](err-suppress-narrow.md) - the narrow form of intentional suppression
- [python-err-logging-exception](err-logging-exception.md) - recording a broad failure at an isolation boundary
