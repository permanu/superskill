---
id: python-obs-library-null-handler
lang: python
prefix: obs
title: Attach only a NullHandler in library code and let applications configure handlers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [NullHandler, library, handlers, configuration]
  files: ["**/*.py"]
  symbols: [logging.NullHandler]
related: [python-obs-module-logger, python-obs-dictconfig]
sources:
  - title: Logging HOWTO - Configuring Logging for a Library
    url: https://docs.python.org/3/howto/logging.html
---

> Attach only a NullHandler in library code; applications own handler configuration.

## Why

The howto's library guidance is explicit: do not add any handlers other than `NullHandler`, because handler choice belongs to the application that knows its audience and deployment. A library that installs a StreamHandler writes to stderr under the application's feet and interferes with its own logging and tests. `NullHandler` marks the events as handled without output, so unconfigured applications see nothing until they opt in.

## Bad

```python
import logging

logger = logging.getLogger(__name__)
logger.addHandler(logging.StreamHandler())
logger.setLevel(logging.INFO)
```

## Good

```python
import logging

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())
```

## See Also

- [python-obs-module-logger](obs-module-logger.md) - naming the logger the application will configure
- [python-obs-dictconfig](obs-dictconfig.md) - how the application configures those handlers
