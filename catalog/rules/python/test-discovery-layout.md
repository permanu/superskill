---
id: python-test-discovery-layout
lang: python
prefix: test
title: Keep test modules importable and free of import-time side effects
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [discovery, import, test layout, side effects]
  files: ["**/*.py"]
  symbols: [unittest]
related: [python-test-temp-dir]
sources:
  - title: unittest - Test Discovery
    url: https://docs.python.org/3/library/unittest.html
---

> Make test modules importable and side-effect free so discovery can load them.

## Why

Test discovery imports every test module before running anything, so a module that reads config, opens sockets, or mutates global state at import time breaks collection before a single test runs. Importable module names under the discovery root are required, and test code belongs in separate modules from the code under test. Work happens inside tests or fixtures, not at import.

## Bad

```python
import json
from pathlib import Path

CONFIG = json.loads(Path("config.json").read_text(encoding="utf-8"))


def test_port() -> None:
    assert CONFIG["port"] == 8080
```

## Good

```python
import json
import tempfile
import unittest
from pathlib import Path


def load_config(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


class TestConfig(unittest.TestCase):
    def test_port(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "config.json"
            path.write_text('{"port": 8080}', encoding="utf-8")
            self.assertEqual(load_config(path)["port"], 8080)
```

## See Also

- [python-test-temp-dir](test-temp-dir.md) - where the files this test needs are created
