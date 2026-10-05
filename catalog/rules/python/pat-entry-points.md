---
id: python-pat-entry-points
lang: python
prefix: pat
title: Discover plugins through package metadata entry points
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [entry points, plugins, discovery, importlib.metadata]
  files: ["**/*.py"]
  symbols: [importlib.metadata.entry_points]
related: [python-pat-namespace-plugins, python-proj-console-scripts]
sources:
  - title: Creating and discovering plugins
    url: https://packaging.python.org/en/latest/guides/creating-and-discovering-plugins/
  - title: importlib.metadata - Accessing package metadata
    url: https://docs.python.org/3/library/importlib.metadata.html
---

> Register plugins as entry points; the metadata names them without importing everything.

## Why

The PyPA plugins guide states that packages can declare plugin metadata through entry points and that a host package can use that metadata to discover plugins, showing entry_points(group='myapp.plugins') and calling load() on the result. A hardcoded import list requires the host to know every plugin and imports all of them to find one. Entry points let each distribution announce itself and load lazily.

## Bad

```python
def load_plugins() -> list[str]:
    return ["csv_plugin", "json_plugin"]
```

## Good

```python
from importlib.metadata import entry_points


def load_plugins() -> list[object]:
    return [entry.load() for entry in entry_points(group="myapp.plugins")]
```

## See Also

- [python-pat-namespace-plugins](pat-namespace-plugins.md) - the import-path alternative to metadata discovery
- [python-proj-console-scripts](proj-console-scripts.md) - entry points in their console-script form
