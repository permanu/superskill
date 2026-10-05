---
id: python-err-reraise-bare
lang: python
prefix: err
title: Re-raise the active exception with a bare raise so the original traceback stays intact
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [raise, reraise, traceback, handler]
  files: ["**/*.py"]
  symbols: [raise]
related: [python-err-logging-exception]
sources:
  - title: Python Tutorial - Raising Exceptions
    url: https://docs.python.org/3/tutorial/errors.html
  - title: PEP 654 - Raising exceptions in an except* block
    url: https://peps.python.org/pep-0654/
---

> Re-raise the active exception with a bare raise so the original traceback stays intact.

## Why

`raise exc` re-raises the same object through the current frame, adding a stack entry and leaving the active-exception machinery behind. A bare `raise` continues the original propagation with its traceback unchanged. The difference shows up in every traceback and in the output of chained exceptions, where the extra frame points at the re-raise instead of the failure.

## Bad

```python
import logging

logger = logging.getLogger(__name__)


def upload(records: list[dict[str, object]]) -> None:
    raise OSError("network down")


def sync(records: list[dict[str, object]]) -> None:
    try:
        upload(records)
    except OSError as exc:
        logger.warning("upload failed, will retry")
        raise exc
```

## Good

```python
import logging

logger = logging.getLogger(__name__)


def upload(records: list[dict[str, object]]) -> None:
    raise OSError("network down")


def sync(records: list[dict[str, object]]) -> None:
    try:
        upload(records)
    except OSError:
        logger.warning("upload failed, will retry")
        raise
```

## See Also

- [python-err-logging-exception](err-logging-exception.md) - logging the failure before letting it propagate
