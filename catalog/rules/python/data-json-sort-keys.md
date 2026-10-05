---
id: python-data-json-sort-keys
lang: python
prefix: data
title: Serialize JSON with sort_keys for stable, diffable output
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [json, sort_keys, stable, diff]
  files: ["**/*.py"]
  symbols: [json.dumps, sort_keys]
related: [python-data-json-default]
sources:
  - title: json - JSONEncoder sort_keys
    url: https://docs.python.org/3/library/json.html
---

> Use sort_keys=True so serialized JSON is stable across runs and diffable.

## Why

Dict order follows insertion, so the same data serialized from different code paths produces different text. The json docs note that sorting keys is useful for regression tests so serializations can be compared day to day. Stable output also makes cached responses, content hashes, and golden files reliable.

## Bad

```python
import json


def encode(config: dict[str, int]) -> str:
    return json.dumps(config)
```

## Good

```python
import json


def encode(config: dict[str, int]) -> str:
    return json.dumps(config, sort_keys=True)
```

## See Also

- [python-data-json-default](data-json-default.md) - handling the values that sorting alone does not make encodable
