---
id: python-test-temp-dir
lang: python
prefix: test
title: Put filesystem fixtures under TemporaryDirectory so cleanup is automatic
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [TemporaryDirectory, tempfile, files, cleanup]
  files: ["**/*.py"]
  symbols: [tempfile.TemporaryDirectory]
related: [python-test-discovery-layout]
sources:
  - title: tempfile - TemporaryDirectory
    url: https://docs.python.org/3/library/tempfile.html
---

> Create filesystem fixtures under TemporaryDirectory, not fixed paths.

## Why

Tests that write to fixed paths collide across concurrent runs, leave artifacts behind, and fail on read-only or differently laid out checkouts. `TemporaryDirectory` creates a uniquely named directory and removes it with its contents when the context exits. Each test owns its files, so runs cannot interfere.

## Bad

```python
from pathlib import Path


def test_write() -> None:
    path = Path("/tmp/report.txt")
    path.write_text("ok", encoding="utf-8")
    assert path.read_text(encoding="utf-8") == "ok"
```

## Good

```python
import tempfile
from pathlib import Path


def test_write() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "report.txt"
        path.write_text("ok", encoding="utf-8")
        assert path.read_text(encoding="utf-8") == "ok"
```

## See Also

- [python-test-discovery-layout](test-discovery-layout.md) - keeping the test module free of import-time file access
