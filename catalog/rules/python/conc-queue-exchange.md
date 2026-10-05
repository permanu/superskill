---
id: python-conc-queue-exchange
lang: python
prefix: conc
title: Exchange data between threads through queue.Queue
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Queue, threads, shared data, queue]
  files: ["**/*.py"]
  symbols: [queue.Queue]
related: [python-conc-lock-with, python-conc-message-passing]
sources:
  - title: queue - A synchronized queue class
    url: https://docs.python.org/3/library/queue.html
  - title: threading - Thread-based parallelism
    url: https://docs.python.org/3/library/threading.html
---

> Move data between threads through a Queue; a bare list is shared state with no locking.

## Why

The queue docs state that the module implements multi-producer, multi-consumer queues, that it is especially useful when information must be exchanged safely between multiple threads, and that Queue implements all the required locking semantics. The threading docs point to queue as the thread-safe interface for exchanging data between running threads. A list appended from several threads races on the internal bookkeeping and gives no ordering or blocking guarantees.

## Bad

```python
import threading

results: list[int] = []


def worker(value: int) -> None:
    results.append(value * 2)


threads = [threading.Thread(target=worker, args=(n,)) for n in range(4)]
```

## Good

```python
import queue
import threading

results = queue.Queue()


def worker(value: int) -> None:
    results.put(value * 2)


threads = [threading.Thread(target=worker, args=(n,)) for n in range(4)]
```

## See Also

- [python-conc-lock-with](conc-lock-with.md) - the lock discipline a Queue hides from you
- [python-conc-message-passing](conc-message-passing.md) - the same pattern across processes
