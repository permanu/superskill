---
id: python-pat-module-singleton
lang: python
prefix: pat
title: Use a module as the singleton instead of a Singleton class
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [singleton, module, state, design]
  files: ["**/*.py"]
  symbols: [__name__]
related: [python-api-import-side-effects, python-pat-strategy-callable]
sources:
  - title: The Python Tutorial - Modules
    url: https://docs.python.org/3/tutorial/modules.html
---

> Let a module hold the single instance; a Singleton class adds a pattern Python does not need.

## Why

The modules tutorial states that each module is only imported once per interpreter session, so module-level objects are naturally single. A Singleton class that overrides __new__ adds an indirection that fights the language and complicates tests, which then cannot create a second isolated instance. Module state also reads as plain names rather than an accessor call.

## Bad

```python
class Config:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
```

## Good

```python
config: dict[str, str] = {}


def get(key: str) -> str:
    return config[key]
```

## See Also

- [python-api-import-side-effects](api-import-side-effects.md) - what may run the one time a module is imported
- [python-pat-strategy-callable](pat-strategy-callable.md) - keeping variation in arguments rather than types
