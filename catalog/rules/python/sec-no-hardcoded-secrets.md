---
id: python-sec-no-hardcoded-secrets
lang: python
prefix: sec
title: Load credentials from the environment or a secret store, never from literals
severity: must
enforce: tool
tool: ruff:S105
baseline: latest
status: verified
triggers:
  keywords: [credentials, api key, environment, secrets]
  files: ["**/*.py"]
  symbols: [os.environ]
related: [python-sec-secrets-not-random]
sources:
  - title: secrets - Generate secure random numbers for managing secrets
    url: https://docs.python.org/3/library/secrets.html
  - title: Ruff - Rules
    url: https://docs.astral.sh/ruff/rules/
---

> Load credentials from the environment; hardcoded secrets leak with the repository.

## Why

A literal API key or password is copied into git history, container images, and crash logs, and rotating it requires a code change and redeploy. Reading from the environment or a secrets manager keeps the value out of the source tree and lets each deployment supply its own. Ruff flags likely hardcoded passwords so the leak is caught before commit.

## Bad

```python
API_KEY = "sk-live-3f9a1c2b"


def auth_header() -> dict[str, str]:
    return {"Authorization": f"Bearer {API_KEY}"}
```

## Good

```python
import os


def api_key() -> str:
    key = os.environ.get("API_KEY")
    if not key:
        raise RuntimeError("API_KEY is not set")
    return key


def auth_header() -> dict[str, str]:
    return {"Authorization": f"Bearer {api_key()}"}
```

## See Also

- [python-sec-secrets-not-random](sec-secrets-not-random.md) - generating credentials when the service issues them
