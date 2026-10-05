---
id: python-api-import-side-effects
lang: python
prefix: api
title: Keep work out of import time; guard scripts behind __main__
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [import, side effects, __main__, script]
  files: ["**/*.py"]
  symbols: [__name__]
related: [python-test-isolation, python-proj-console-scripts]
sources:
  - title: The Python Tutorial - Modules
    url: https://docs.python.org/3/tutorial/modules.html
---

> Keep work out of import time; guard executable code behind __main__.

## Why

The tutorial states that a module's executable statements are intended to initialize the module and are executed only the first time the module name is encountered in an import statement. Work placed there runs for every importer, including tests and tooling. The __name__ == "__main__" guard keeps code that should run only as a script out of that path.

## Bad

```python
import json


def load(path: str) -> dict[str, object]:
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


load("config.json")
```

## Good

```python
import json


def load(path: str) -> dict[str, object]:
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


if __name__ == "__main__":
    print(load("config.json"))
```

## See Also

- [python-test-isolation](test-isolation.md) - import-time work also breaks test isolation
- [python-proj-console-scripts](proj-console-scripts.md) - declaring entry points instead of import-time execution
