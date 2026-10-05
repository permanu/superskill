---
id: python-conc-join-threads
lang: python
prefix: conc
title: Join the threads you start before relying on their results
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [join, threads, shutdown, synchronization]
  files: ["**/*.py"]
  symbols: [threading.Thread.join]
related: [python-conc-daemon-graceful]
sources:
  - title: threading - Thread-based parallelism
    url: https://docs.python.org/3/library/threading.html
---

> Join the threads you start; the program exits when only daemon threads remain, not when work is done.

## Why

The threading docs state that a thread's activity must be started with start() and that another thread can call join() to block until it terminates. The daemon section notes that the program exits when no alive non-daemon threads are left, so a started worker that is never joined can be cut short or outlive the code that depends on it. join() is how the creator waits for the work it scheduled.

## Bad

```python
import threading


def work() -> None:
    print("work")


threading.Thread(target=work).start()
print("done")
```

## Good

```python
import threading


def work() -> None:
    print("work")


worker = threading.Thread(target=work)
worker.start()
worker.join()
print("done")
```

## See Also

- [python-conc-daemon-graceful](conc-daemon-graceful.md) - why daemon threads cannot stand in for join
