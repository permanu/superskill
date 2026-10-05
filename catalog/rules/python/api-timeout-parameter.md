---
id: python-api-timeout-parameter
lang: python
prefix: api
title: Give blocking operations an explicit timeout parameter
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [timeout, blocking, network, api]
  files: ["**/*.py"]
  symbols: [timeout]
related: [python-err-asyncio-timeout]
sources:
  - title: urllib.request - Extensible library for opening URLs
    url: https://docs.python.org/3/library/urllib.request.html
---

> Give blocking operations an explicit timeout; a call with no timeout can hang the caller forever.

## Why

The urllib.request docs describe the timeout parameter as bounding blocking operations like the connection attempt, and state that without it the global default applies, which the library does not control. A blocking call with no bound can hang the calling thread indefinitely, and the caller has no handle to shorten it. Exposing a timeout parameter lets the caller choose the bound.

## Bad

```python
from urllib.request import urlopen


def fetch(url: str) -> bytes:
    with urlopen(url) as response:
        return response.read()
```

## Good

```python
from urllib.request import urlopen


def fetch(url: str, timeout: float = 10.0) -> bytes:
    with urlopen(url, timeout=timeout) as response:
        return response.read()
```

## See Also

- [python-err-asyncio-timeout](err-asyncio-timeout.md) - bounding awaited I/O with asyncio.timeout
