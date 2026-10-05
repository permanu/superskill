---
id: python-io-response-close
lang: python
prefix: io
title: Use urlopen responses as context managers so the connection is released
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [urlopen, response, close, context manager]
  files: ["**/*.py"]
  symbols: [urllib.request.urlopen]
related: [python-err-context-manager-cleanup, python-sec-ssl-verify]
sources:
  - title: urllib.request - Extensible library for opening URLs
    url: https://docs.python.org/3/library/urllib.request.html
  - title: contextlib - Utilities for with-statement contexts
    url: https://docs.python.org/3/library/contextlib.html
---

> Close urlopen responses with a with statement; urlopen returns an object built to be used as a context manager.

## Why

The urllib.request docs state that urlopen always returns an object which can work as a context manager and carries the url, headers, and status properties. The contextlib docs show closing(urlopen(...)) for the same effect and note that urlopen would normally be used in a context manager. Using the response as a context manager closes it at block exit instead of leaving it to the garbage collector.

## Bad

```python
from urllib.request import urlopen


def fetch(url: str) -> bytes:
    return urlopen(url, timeout=5).read()
```

## Good

```python
from urllib.request import urlopen


def fetch(url: str) -> bytes:
    with urlopen(url, timeout=5) as response:
        return response.read()
```

## See Also

- [python-err-context-manager-cleanup](err-context-manager-cleanup.md) - the general rule this applies to network responses
- [python-sec-ssl-verify](sec-ssl-verify.md) - verifying the peer before reading the response
