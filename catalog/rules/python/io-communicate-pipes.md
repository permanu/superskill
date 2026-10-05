---
id: python-io-communicate-pipes
lang: python
prefix: io
title: Drain subprocess pipes with communicate instead of waiting on the process
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [subprocess, PIPE, deadlock, communicate]
  files: ["**/*.py"]
  symbols: [subprocess.run, Popen.communicate]
related: [python-sec-subprocess-no-shell]
sources:
  - title: subprocess - Subprocess management
    url: https://docs.python.org/3/library/subprocess.html
---

> Read subprocess output with communicate or subprocess.run; waiting with a full pipe deadlocks the child.

## Why

The subprocess docs warn that waiting on a child while stdout=PIPE or stderr=PIPE is set will deadlock when the child generates enough output to fill the OS pipe buffer, and direct callers to Popen.communicate. subprocess.run performs that drain and adds timeout and check handling. A wait-then-read sequence blocks before the read ever runs.

## Bad

```python
import subprocess


def run(cmd: list[str]) -> str:
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    proc.wait()
    assert proc.stdout is not None
    return proc.stdout.read().decode("utf-8")
```

## Good

```python
import subprocess


def run(cmd: list[str]) -> str:
    proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return proc.stdout
```

## See Also

- [python-sec-subprocess-no-shell](sec-subprocess-no-shell.md) - passing the command as an argument list
