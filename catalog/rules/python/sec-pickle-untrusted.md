---
id: python-sec-pickle-untrusted
lang: python
prefix: sec
title: Never unpickle data that crossed a trust boundary
severity: must
enforce: tool
tool: ruff:S301
baseline: latest
status: verified
triggers:
  keywords: [pickle, deserialization, untrusted, json]
  files: ["**/*.py"]
  symbols: [pickle.loads, pickle.load]
related: [python-sec-eval-literal, python-data-json-default]
sources:
  - title: pickle - Warning
    url: https://docs.python.org/3/library/pickle.html
  - title: Security Considerations
    url: https://docs.python.org/3/library/security_warnings.html
  - title: Ruff - Rules
    url: https://docs.astral.sh/ruff/rules/
---

> Never unpickle untrusted data; pickle executes code during loading.

## Why

The pickle docs warn that malicious pickle data can execute arbitrary code during unpickling and that only trusted data should be unpickled. Unlike JSON, deserializing untrusted pickle is itself an arbitrary code execution vulnerability. Use a data-only format across trust boundaries and reserve pickle for data the process produced itself.

## Bad

```python
import pickle


def load_session(raw: bytes) -> object:
    return pickle.loads(raw)
```

## Good

```python
import json


def load_session(raw: bytes) -> dict[str, object]:
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("session must be a JSON object")
    return data
```

## See Also

- [python-sec-eval-literal](sec-eval-literal.md) - the same rule for code-shaped strings
- [python-data-json-default](data-json-default.md) - serializing the other direction
