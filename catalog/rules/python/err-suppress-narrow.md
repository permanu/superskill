---
id: python-err-suppress-narrow
lang: python
prefix: err
title: Suppress only specific, expected errors with contextlib.suppress
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [suppress, contextlib, ignore, narrow]
  files: ["**/*.py"]
  symbols: [contextlib.suppress, ProcessLookupError]
related: [python-err-no-bare-except]
sources:
  - title: contextlib - suppress
    url: https://docs.python.org/3/library/contextlib.html
---

> Suppress only specific, expected errors with contextlib.suppress; never Exception or BaseException.

## Why

`suppress` documents that the named failure is expected and safe to ignore. Suppressing a broad class also hides permission failures, programming errors, and unrelated faults raised by the same block. Name the one exception the code anticipates and let everything else propagate, so unexpected failures still reach the caller.

## Bad

```python
import os
import signal
from contextlib import suppress


def stop_all(pids: list[int]) -> None:
    for pid in pids:
        with suppress(Exception):
            os.kill(pid, signal.SIGTERM)
```

## Good

```python
import os
import signal
from contextlib import suppress


def stop_all(pids: list[int]) -> None:
    for pid in pids:
        with suppress(ProcessLookupError):
            os.kill(pid, signal.SIGTERM)
```

## See Also

- [python-err-no-bare-except](err-no-bare-except.md) - the same narrowing rule for `try/except` handlers
