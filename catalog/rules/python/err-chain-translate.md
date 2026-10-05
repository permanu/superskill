---
id: python-err-chain-translate
lang: python
prefix: err
title: Translate exceptions with raise from so the original failure stays attached as the cause
severity: must
enforce: tool
tool: ruff:B904
baseline: latest
status: verified
triggers:
  keywords: [raise, from, exception, chaining, cause]
  files: ["**/*.py"]
  symbols: [raise, __cause__]
related: [python-err-chain-suppress, python-err-custom-hierarchy]
sources:
  - title: Python Tutorial - Exception Chaining
    url: https://docs.python.org/3/tutorial/errors.html
  - title: PEP 3134 - Exception Chaining and Embedded Tracebacks
    url: https://peps.python.org/pep-3134/
  - title: Ruff B904 - raise-without-from-inside-except
    url: https://docs.astral.sh/ruff/rules/raise-without-from-inside-except/
---

> Chain a translated exception to its cause with the from clause.

## Why

A translated exception raised without `from` discards the explicit cause and leaves the original failure as incidental context. The `from` clause records that the new error is a direct consequence, so the traceback shows the root failure before the translation. Linters flag the omission by default because it costs debugging time on every occurrence.

## Bad

```python
def read_config(path: str) -> str:
    try:
        with open(path, encoding="utf-8") as handle:
            return handle.read()
    except OSError:
        raise RuntimeError("cannot read config")
```

## Good

```python
class ConfigError(Exception):
    pass


def read_config(path: str) -> str:
    try:
        with open(path, encoding="utf-8") as handle:
            return handle.read()
    except OSError as exc:
        raise ConfigError(f"cannot read config: {path}") from exc
```

## See Also

- [python-err-chain-suppress](err-chain-suppress.md) - the narrow case for hiding a cause with `from None`
- [python-err-custom-hierarchy](err-custom-hierarchy.md) - the base class a translated error should join
