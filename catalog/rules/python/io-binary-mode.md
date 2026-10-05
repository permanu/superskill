---
id: python-io-binary-mode
lang: python
prefix: io
title: Open non-text payloads in binary mode so no decoding or newline translation runs
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [binary, bytes, encoding, digest]
  files: ["**/*.py"]
  symbols: [hashlib.file_digest]
related: [python-data-encoding-explicit, python-sec-hash-integrity]
sources:
  - title: io - Core tools for working with streams
    url: https://docs.python.org/3/library/io.html
  - title: hashlib - Secure hashes and message digests
    url: https://docs.python.org/3/library/hashlib.html
---

> Open non-text payloads in binary mode; text mode decodes bytes and translates newlines before the data is used.

## Why

The io docs split streams into text I/O, which expects and produces str and applies encoding and newline translation, and binary I/O, which expects bytes-like objects and produces bytes with no encoding, decoding, or newline translation. hashlib's file_digest requires a file-like object opened in binary mode, so digesting through text mode either fails or hashes a transformed payload. Binary mode is the correct frame for images, archives, and digests.

## Bad

```python
import hashlib


def digest(path: str) -> str:
    with open(path, encoding="utf-8") as handle:
        data = handle.read().encode("utf-8")
    return hashlib.sha256(data).hexdigest()
```

## Good

```python
import hashlib


def digest(path: str) -> str:
    with open(path, "rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()
```

## See Also

- [python-data-encoding-explicit](data-encoding-explicit.md) - the text-mode case where an encoding is required
- [python-sec-hash-integrity](sec-hash-integrity.md) - hashing as an integrity check
