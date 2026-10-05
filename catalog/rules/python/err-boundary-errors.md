---
id: python-err-boundary-errors
lang: python
prefix: err
title: Validate external input at the boundary and raise the built-in type that matches the failure
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [validate, boundary, input, TypeError, ValueError]
  files: ["**/*.py"]
  symbols: [isinstance, json.loads]
related: [python-err-custom-hierarchy, python-err-chain-translate]
sources:
  - title: Built-in Exceptions - TypeError and ValueError
    url: https://docs.python.org/3/library/exceptions.html
  - title: Google Python Style Guide - Exceptions
    url: https://google.github.io/styleguide/pyguide.html
---

> Validate external input at the boundary; raise TypeError for wrong types and ValueError for wrong values.

## Why

`TypeError` signals a value of the wrong type; `ValueError` signals a value of the right type with an unusable value. Applying that split in one parser at the edge gives every caller a single guarded entry point and keeps conversion failures out of the middle of business logic. Inside the boundary, the rest of the code receives values that already hold their invariants.

## Bad

```python
import json


def load_port(raw: str) -> int:
    config = json.loads(raw)
    return int(config["port"])
```

## Good

```python
import json


def parse_port(raw: str) -> int:
    try:
        config = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("config must be valid JSON") from exc
    if not isinstance(config, dict):
        raise TypeError(f"config must be an object, got {type(config).__name__}")
    port = config.get("port")
    if not isinstance(port, int) or isinstance(port, bool):
        raise TypeError("config.port must be an int")
    if not 0 < port < 65536:
        raise ValueError(f"config.port out of range: {port}")
    return port
```

## See Also

- [python-err-custom-hierarchy](err-custom-hierarchy.md) - domain errors for failures the boundary cannot classify by type or value
- [python-err-chain-translate](err-chain-translate.md) - attaching the decode failure as the cause
