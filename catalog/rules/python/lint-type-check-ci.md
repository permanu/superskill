---
id: python-lint-type-check-ci
lang: python
prefix: lint
title: Run a static type checker in CI; annotations are not enforced at runtime
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mypy, type checker, CI, annotations]
  files: ["**/*.py"]
  symbols: [subprocess.run]
related: [python-type-annotate-signatures, python-lint-py-typed]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
  - title: mypy - Getting started
    url: https://mypy.readthedocs.io/en/stable/getting_started.html
---

> Run the type checker in CI; the interpreter never enforces annotations.

## Why

The typing docs state that the Python runtime does not enforce function and variable type annotations and that they are used by third party tools such as type checkers. The mypy docs describe its checking as static, finding errors without ever running the code. A test suite alone leaves annotated code unchecked, so the checker belongs in the same pipeline.

## Bad

```python
import subprocess


def ci() -> None:
    subprocess.run(["pytest"], check=True)
```

## Good

```python
import subprocess
import sys


def ci() -> None:
    subprocess.run(["pytest"], check=True)
    subprocess.run([sys.executable, "-m", "mypy", "src"], check=True)
```

## See Also

- [python-type-annotate-signatures](type-annotate-signatures.md) - the annotations this check validates
- [python-lint-py-typed](lint-py-typed.md) - opting the package into inline type checking
