---
id: python-api-keyword-only
lang: python
prefix: api
title: Make optional parameters keyword-only with the star marker
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [keyword-only, parameters, signature, api]
  files: ["**/*.py"]
  symbols: [def]
related: [python-api-bool-params]
sources:
  - title: PEP 3102 - Keyword-Only Arguments
    url: https://peps.python.org/pep-3102/
  - title: The Python Tutorial - More Control Flow Tools
    url: https://docs.python.org/3/tutorial/controlflow.html
---

> Make optional parameters keyword-only; call sites read better and new parameters do not shift positions.

## Why

PEP 3102 introduces keyword-only arguments, which can only be supplied by keyword and are never filled in by a positional argument. The tutorial adds that keyword-only names make a definition more understandable and stop callers relying on argument position. Optional flags become self-documenting at the call site, and adding a new keyword parameter cannot shift an existing positional one.

## Bad

```python
def connect(host: str, port: int, timeout: float, retries: int) -> None:
    print(host, port, timeout, retries)


connect("db.internal", 5432, 5.0, 3)
```

## Good

```python
def connect(host: str, port: int, *, timeout: float = 5.0, retries: int = 3) -> None:
    print(host, port, timeout, retries)


connect("db.internal", 5432, timeout=10.0, retries=1)
```

## See Also

- [python-api-bool-params](api-bool-params.md) - the parameter type that benefits most from the star
