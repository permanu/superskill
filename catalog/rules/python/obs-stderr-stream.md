---
id: python-obs-stderr-stream
lang: python
prefix: obs
title: Send logs to stderr and keep stdout for the program's data output
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [stderr, stdout, stream, cli]
  files: ["**/*.py"]
  symbols: [logging.StreamHandler]
related: [python-obs-no-print]
sources:
  - title: logging.handlers - StreamHandler
    url: https://docs.python.org/3/library/logging.handlers.html
  - title: Logging HOWTO - What happens if no configuration is provided
    url: https://docs.python.org/3/howto/logging.html
---

> Send logs to stderr; stdout belongs to the program's data output.

## Why

`StreamHandler` defaults to `sys.stderr`, and the howto's last-resort handler also writes there, so diagnostics never mix into the data stream. A CLI that logs to stdout corrupts anything downstream that pipes or parses its output. Keeping the channels separate lets users redirect data and diagnostics independently.

## Bad

```python
import logging
import sys


def setup() -> None:
    logging.basicConfig(stream=sys.stdout, level=logging.INFO)
```

## Good

```python
import logging
import sys


def setup() -> None:
    logging.basicConfig(stream=sys.stderr, level=logging.INFO)
```

## See Also

- [python-obs-no-print](obs-no-print.md) - the other half of keeping the channels clean
