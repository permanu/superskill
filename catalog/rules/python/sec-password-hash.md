---
id: python-sec-password-hash
lang: python
prefix: sec
title: Hash passwords with scrypt or pbkdf2_hmac instead of a bare digest
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [password, scrypt, pbkdf2, salt, kdf]
  files: ["**/*.py"]
  symbols: [hashlib.scrypt, hashlib.pbkdf2_hmac]
related: [python-sec-secrets-not-random, python-sec-hash-integrity]
sources:
  - title: hashlib - Key derivation
    url: https://docs.python.org/3/library/hashlib.html
  - title: secrets - Recipes and best practices
    url: https://docs.python.org/3/library/secrets.html
---

> Hash passwords with a slow key derivation function, not a bare digest.

## Why

General digests are designed to be fast, so a leaked password hash can be tested at enormous guess rates. The hashlib docs state that a password hashing function must be tunable, slow, and salted, and provide `scrypt` and `pbkdf2_hmac` for that purpose. A per-password salt also stops precomputed tables and identical passwords producing identical hashes.

## Bad

```python
import hashlib


def store(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()
```

## Good

```python
import hashlib
import secrets


def store(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return f"{salt.hex()}${digest.hex()}"
```

## See Also

- [python-sec-secrets-not-random](sec-secrets-not-random.md) - the source for the salt
- [python-sec-hash-integrity](sec-hash-integrity.md) - why a fast digest is still right for integrity checks
