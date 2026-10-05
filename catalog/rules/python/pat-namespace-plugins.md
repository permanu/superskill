---
id: python-pat-namespace-plugins
lang: python
prefix: pat
title: Discover plugins in a namespace package with pkgutil
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [namespace package, plugins, pkgutil, discovery]
  files: ["**/*.py"]
  symbols: [pkgutil.iter_modules]
related: [python-pat-entry-points, python-proj-src-layout]
sources:
  - title: Creating and discovering plugins
    url: https://packaging.python.org/en/latest/guides/creating-and-discovering-plugins/
---

> Put plugins under a namespace package and discover them with pkgutil.iter_modules.

## Why

The PyPA plugins guide presents namespace packages as one of the three plugin discovery approaches: make a sub-package like myapp.plugins a namespace package, let other distributions provide modules there, and enumerate them with pkgutil.iter_modules over the package's __path__. The guide's example shows passing the namespace path and prefix so the returned names are absolute and importable. That keeps discovery to one directory scan instead of an import of every installed package.

## Bad

```python
def load_plugins() -> list[str]:
    return ["myapp_plugin_a", "myapp_plugin_b"]
```

## Good

```python
import importlib
import pkgutil

import myapp.plugins


def load_plugins() -> dict[str, object]:
    return {
        name: importlib.import_module(name)
        for _, name, _ in pkgutil.iter_modules(myapp.plugins.__path__, "myapp.plugins.")
    }
```

## See Also

- [python-pat-entry-points](pat-entry-points.md) - the metadata-based discovery approach
- [python-proj-src-layout](proj-src-layout.md) - laying out the packages that provide the namespace
