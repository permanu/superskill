---
id: python-data-json-default
lang: python
prefix: data
title: Serialize non-JSON types through an explicit default callable
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [json, default, serialization, Decimal, datetime]
  files: ["**/*.py"]
  symbols: [json.dumps, default]
related: [python-sec-pickle-untrusted]
sources:
  - title: json - Basic Usage and default parameter
    url: https://docs.python.org/3/library/json.html
---

> Pass an explicit default to json.dumps for non-JSON types.

## Why

The JSON encoder handles only the documented Python types and raises `TypeError` for `Decimal`, `datetime`, and sets. Formatting those values into strings by hand produces invalid JSON as soon as a quote or brace appears in the data. The `default` callable converts each unsupported object exactly once inside the encoder, so the output stays valid and nested values still encode correctly.

## Bad

```python
from decimal import Decimal


def encode(price: Decimal) -> str:
    return '{"price": ' + str(price) + "}"
```

## Good

```python
from decimal import Decimal
import json


def encode(price: Decimal) -> str:
    return json.dumps({"price": price}, default=str)
```

## See Also

- [python-sec-pickle-untrusted](sec-pickle-untrusted.md) - why this data-only format is the right boundary
