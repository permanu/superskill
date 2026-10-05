---
id: python-sec-hash-integrity
lang: python
prefix: sec
title: Use SHA-256 or stronger for integrity checks instead of MD5 or SHA-1
severity: should
enforce: tool
tool: ruff:S324
baseline: latest
status: verified
triggers:
  keywords: [hashlib, sha256, md5, sha1, integrity]
  files: ["**/*.py"]
  symbols: [hashlib.sha256, hashlib.md5]
related: [python-sec-password-hash]
sources:
  - title: hashlib - Hash algorithms
    url: https://docs.python.org/3/library/hashlib.html
  - title: Ruff - Rules
    url: https://docs.astral.sh/ruff/rules/
---

> Use SHA-256 or stronger for integrity; MD5 and SHA-1 are broken for collisions.

## Why

The hashlib docs warn that MD5 and SHA1 have known collision weaknesses, so an attacker can produce two different inputs with the same digest and defeat a checksum. Modern digests in the same API remain collision-resistant, so the switch is a name change. Ruff flags MD5 and SHA1 usage.

## Bad

```python
import hashlib


def fingerprint(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()
```

## Good

```python
import hashlib


def fingerprint(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
```

## See Also

- [python-sec-password-hash](sec-password-hash.md) - why integrity digests are still wrong for passwords
