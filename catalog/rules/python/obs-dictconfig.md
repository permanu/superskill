---
id: python-obs-dictconfig
lang: python
prefix: obs
title: Configure logging once at the entry point with dictConfig
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dictConfig, configuration, entry point, basicConfig]
  files: ["**/*.py"]
  symbols: [logging.config.dictConfig]
related: [python-obs-library-null-handler, python-obs-rotation]
sources:
  - title: Logging HOWTO - Configuring Logging
    url: https://docs.python.org/3/howto/logging.html
  - title: logging.config - Configuration functions
    url: https://docs.python.org/3/library/logging.config.html
---

> Configure logging once at the entry point with dictConfig.

## Why

The howto describes dictionary configuration as a superset of the file format and the recommended method for new applications; it sets loggers, handlers, formatters, and levels in one declarative object graph. `basicConfig` does nothing once the root logger has handlers, so setup calls scattered through modules silently lose their effect, and ad-hoc `setLevel` calls leave the configuration split across files. One `dictConfig` at the entry point is the whole state.

## Bad

```python
import logging


def setup() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    logging.getLogger("app").setLevel(logging.DEBUG)
```

## Good

```python
import logging.config

CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "%(levelname)s %(name)s %(message)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "root": {"level": "INFO", "handlers": ["console"]},
}


def setup() -> None:
    logging.config.dictConfig(CONFIG)
```

## See Also

- [python-obs-library-null-handler](obs-library-null-handler.md) - why libraries leave this to the application
- [python-obs-rotation](obs-rotation.md) - a handler that belongs in this configuration
