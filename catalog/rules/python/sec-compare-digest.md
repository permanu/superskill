---
id: python-sec-compare-digest
lang: python
prefix: sec
title: Compare secrets with hmac.compare_digest instead of equality
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [compare_digest, timing attack, token, hmac]
  files: ["**/*.py"]
  symbols: [hmac.compare_digest]
related: [python-sec-secrets-not-random]
sources:
  - title: hmac - Keyed-Hashing for Message Authentication
    url: https://docs.python.org/3/library/hmac.html
  - title: secrets - compare_digest
    url: https://docs.python.org/3/library/secrets.html
---

> Compare secrets in constant time with hmac.compare_digest, never with equality.

## Why

The `==` operator stops at the first differing character, so response time reveals how much of a token or digest matched and an attacker can recover it byte by byte. `hmac.compare_digest` is designed to avoid content-based short-circuiting and is recommended by the hmac docs for exactly this verification step. It accepts two `str` values (ASCII only) or two bytes-like values.

## Bad

```python
def valid_token(supplied: str, expected: str) -> bool:
    return supplied == expected
```

## Good

```python
import hmac


def valid_token(supplied: str, expected: str) -> bool:
    return hmac.compare_digest(supplied, expected)
```

## See Also

- [python-sec-secrets-not-random](sec-secrets-not-random.md) - generating the value this comparison verifies
