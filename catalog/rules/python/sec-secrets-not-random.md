---
id: python-sec-secrets-not-random
lang: python
prefix: sec
title: Generate tokens and passwords with secrets instead of the random module
severity: must
enforce: tool
tool: ruff:S311
baseline: latest
status: verified
triggers:
  keywords: [secrets, random, token, password, csprng]
  files: ["**/*.py"]
  symbols: [secrets.token_urlsafe, random.choice]
related: [python-sec-password-hash]
sources:
  - title: secrets - Generate secure random numbers for managing secrets
    url: https://docs.python.org/3/library/secrets.html
  - title: Security Considerations
    url: https://docs.python.org/3/library/security_warnings.html
  - title: Ruff - Rules
    url: https://docs.astral.sh/ruff/rules/
---

> Generate security tokens with secrets; random is not cryptographically secure.

## Why

`random` is a Mersenne Twister seeded for reproducibility, so enough observed output reveals its internal state and predicts future values. The security considerations page states plainly that random should not be used for security purposes. `secrets` draws from the operating system CSPRNG and provides token helpers sized in bytes of entropy.

## Bad

```python
import random
import string


def reset_token(length: int = 32) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))
```

## Good

```python
import secrets


def reset_token(length: int = 32) -> str:
    return secrets.token_urlsafe(length)
```

## See Also

- [python-sec-password-hash](sec-password-hash.md) - the companion decision for storing the password a token protects
