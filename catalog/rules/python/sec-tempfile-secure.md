---
id: python-sec-tempfile-secure
lang: python
prefix: sec
title: Create temporary files with tempfile instead of predictable paths
severity: must
enforce: tool
tool: ruff:S108
baseline: latest
status: verified
triggers:
  keywords: [tempfile, mktemp, race, symlink]
  files: ["**/*.py"]
  symbols: [tempfile.NamedTemporaryFile, tempfile.TemporaryDirectory]
related: [python-sec-path-containment, python-test-temp-dir]
sources:
  - title: Security Considerations
    url: https://docs.python.org/3/library/security_warnings.html
  - title: tempfile - Generate temporary files and directories
    url: https://docs.python.org/3/library/tempfile.html
  - title: Ruff - Rules
    url: https://docs.astral.sh/ruff/rules/
---

> Create temporary files with tempfile; predictable names invite races and symlink attacks.

## Why

A hand-built path such as `/tmp/upload.tmp` can be pre-created or swapped for a symlink between the check and the write, and the security page deprecates `mktemp` for exactly that race. The tempfile functions create the file atomically with a random name in a private location. They also remove the file or directory on close or context exit.

## Bad

```python
def stash(data: bytes) -> str:
    path = "/tmp/upload.tmp"
    with open(path, "wb") as handle:
        handle.write(data)
    return path
```

## Good

```python
import tempfile


def stash(data: bytes) -> str:
    with tempfile.NamedTemporaryFile(delete=False) as handle:
        handle.write(data)
        return handle.name
```

## See Also

- [python-sec-path-containment](sec-path-containment.md) - handling paths that do come from users
- [python-test-temp-dir](test-temp-dir.md) - the testing variant of the same choice
