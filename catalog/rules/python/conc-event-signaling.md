---
id: python-conc-event-signaling
lang: python
prefix: conc
title: Signal between threads with threading.Event, not a polled flag
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Event, signaling, threads, wait]
  files: ["**/*.py"]
  symbols: [threading.Event]
related: [python-conc-daemon-graceful, python-conc-queue-exchange]
sources:
  - title: threading - Thread-based parallelism
    url: https://docs.python.org/3/library/threading.html
---

> Signal between threads with Event; polling a shared flag wakes on a timer, not on the change.

## Why

The threading docs describe an event object as managing an internal flag that set() raises and clear() resets, with wait() blocking until the flag is true. The daemon section names Event as the suitable signalling mechanism for stopping threads gracefully. A worker that loops on a boolean check either spins or sleeps, and the stop is noticed only on the next poll; wait() wakes the thread as soon as the flag is set.

## Bad

```python
import threading
import time

running = True


def worker() -> None:
    while running:
        time.sleep(0.01)
        print("tick")
```

## Good

```python
import threading

stop = threading.Event()


def worker() -> None:
    while not stop.is_set():
        print("tick")


stop.set()
```

## See Also

- [python-conc-daemon-graceful](conc-daemon-graceful.md) - the graceful-stop pattern this enables
- [python-conc-queue-exchange](conc-queue-exchange.md) - the other synchronization tool worth reaching for first
