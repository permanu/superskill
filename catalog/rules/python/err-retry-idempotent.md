---
id: python-err-retry-idempotent
lang: python
prefix: err
title: Retry only operations that are safe to repeat, with a bounded attempt count
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [retry, idempotent, backoff, attempts]
  files: ["**/*.py"]
  symbols: [urlopen]
related: [python-err-asyncio-timeout, python-err-boundary-errors]
sources:
  - title: RFC 9110 - Idempotent Methods
    url: https://www.rfc-editor.org/rfc/rfc9110.html
---

> Retry only operations that are safe to repeat, with a bounded attempt count.

## Why

Repeating a request that changes state applies its effect twice when the first attempt actually succeeded but the response was lost. Idempotent operations and writes made idempotent through keys or conditional requests are safe to repeat; everything else needs detection that the original was never applied. An unbounded retry loop turns a transient failure into a hang, so attempts are capped and separated by a delay.

## Bad

```python
def post(path: str, payload: dict[str, str]) -> None:
    raise OSError("connection reset")


def create_user(payload: dict[str, str]) -> None:
    while True:
        try:
            post("/users", payload)
            return
        except OSError:
            continue
```

## Good

```python
import time
from urllib.request import urlopen


def fetch(url: str, attempts: int = 3) -> bytes:
    for attempt in range(attempts):
        try:
            with urlopen(url, timeout=5) as response:
                return response.read()
        except OSError:
            if attempt == attempts - 1:
                raise
            time.sleep(0.5 * (attempt + 1))
    raise AssertionError("unreachable")
```

## See Also

- [python-err-asyncio-timeout](err-asyncio-timeout.md) - bounding each individual attempt
- [python-err-boundary-errors](err-boundary-errors.md) - validating the payload once before any attempt
