---
id: python-obs-no-print
lang: python
prefix: obs
title: Reserve print for user-facing output and log events through a logger
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [print, logging, events, cli]
  files: ["**/*.py"]
  symbols: [print, logger.info]
related: [python-obs-stderr-stream]
sources:
  - title: Logging HOWTO - When to use logging
    url: https://docs.python.org/3/howto/logging.html
---

> Reserve print for user-facing output; report events through a logger.

## Why

The howto's task table assigns console output for ordinary command usage to `print`, and event reporting for status monitoring or fault investigation to a logger. `print` carries no level, timestamp, or source, cannot be filtered at runtime, and cannot be routed to a file or collector. Log calls survive in the code as dormant DEBUG lines instead of being deleted and re-added.

## Bad

```python
def sync(path: str) -> None:
    print(f"sync failed for {path}")
```

## Good

```python
import logging

logger = logging.getLogger(__name__)


def sync(path: str) -> None:
    logger.error("sync failed for %s", path)
```

## See Also

- [python-obs-stderr-stream](obs-stderr-stream.md) - keeping event output off the data channel
