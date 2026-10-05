---
id: python-anti-dict-keys-membership
lang: python
prefix: anti
title: Test dict membership on the dict itself, not on dict.keys()
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dict, keys, membership, readability]
  files: ["**/*.py"]
  symbols: [dict.keys]
related: [python-perf-defaultdict-count]
sources:
  - title: Ruff SIM118 - in-dict-keys
    url: https://docs.astral.sh/ruff/rules/in-dict-keys/
---

> Test dict membership on the dict itself; .keys() adds a call with the same semantics.

## Why

Ruff's SIM118 states that key in dict is more readable and efficient than key in dict.keys(), with the same semantics. Dict iteration is defined over keys, so the view adds a method call without changing the result. The direct form also matches how the rest of the mapping API is used.

## Bad

```python
def has_flag(flags: dict[str, bool], name: str) -> bool:
    return name in flags.keys()
```

## Good

```python
def has_flag(flags: dict[str, bool], name: str) -> bool:
    return name in flags
```

## See Also

- [python-perf-defaultdict-count](perf-defaultdict-count.md) - another dict idiom that drops a manual step
