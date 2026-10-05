---
id: python-data-datetime-aware
lang: python
prefix: data
title: Use timezone-aware datetimes and store timestamps in UTC
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [datetime, timezone, utc, aware]
  files: ["**/*.py"]
  symbols: [datetime.now, UTC]
related: [python-data-sqlite-transactions]
sources:
  - title: datetime - Aware and naive objects
    url: https://docs.python.org/3/library/datetime.html
---

> Use aware datetimes in UTC for stored timestamps; naive times are ambiguous.

## Why

A naive datetime carries no offset, so it cannot be compared or converted reliably across time zones and daylight saving changes. The datetime docs define an aware object as one that locates itself unambiguously in time, and they deprecate `utcnow()` because it returns a naive UTC value. Store `datetime.now(UTC)` and convert to local time only for display.

## Bad

```python
from datetime import datetime


def stamp() -> str:
    return datetime.now().isoformat()
```

## Good

```python
from datetime import UTC, datetime


def stamp() -> str:
    return datetime.now(UTC).isoformat()
```

## See Also

- [python-data-sqlite-transactions](data-sqlite-transactions.md) - storing those timestamps durably
