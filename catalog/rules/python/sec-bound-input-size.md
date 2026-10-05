---
id: python-sec-bound-input-size
lang: python
prefix: sec
title: Bound the size of untrusted input before parsing
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [input size, resource limits, denial of service, parsing]
  files: ["**/*.py"]
  symbols: [tomllib.loads]
related: [python-sec-pickle-untrusted, python-io-iterate-lines]
sources:
  - title: tomllib - Parse TOML files
    url: https://docs.python.org/3/library/tomllib.html
---

> Bound untrusted input before parsing; a small payload can still consume unbounded CPU and memory.

## Why

The tomllib docs warn that parsing data from untrusted sources is risky because a malicious TOML string may cause the decoder to consume considerable CPU and memory resources, and they recommend limiting the size of the data to be parsed. The same reasoning applies to any parser that reads a whole document. A size check before the parser runs turns an outage into a rejected request.

## Bad

```python
import tomllib


def load_config(data: bytes) -> dict[str, object]:
    return tomllib.loads(data.decode("utf-8"))
```

## Good

```python
import tomllib

MAX_CONFIG_BYTES = 64 * 1024


def load_config(data: bytes) -> dict[str, object]:
    if len(data) > MAX_CONFIG_BYTES:
        raise ValueError("config too large")
    return tomllib.loads(data.decode("utf-8"))
```

## See Also

- [python-sec-pickle-untrusted](sec-pickle-untrusted.md) - refusing untrusted formats outright
- [python-io-iterate-lines](io-iterate-lines.md) - streaming input instead of reading it whole
