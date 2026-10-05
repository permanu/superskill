---
id: python-conc-message-passing
lang: python
prefix: conc
title: Pass messages between processes instead of sharing mutable state
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [processes, shared state, Queue, pickle]
  files: ["**/*.py"]
  symbols: [multiprocessing.Queue]
related: [python-conc-queue-exchange, python-conc-spawn-safety]
sources:
  - title: multiprocessing - Process-based parallelism
    url: https://docs.python.org/3/library/multiprocessing.html
---

> Pass messages between processes; a module-level list is not shared with the children.

## Why

The multiprocessing docs state that concurrent programming should avoid shared state as far as possible, particularly with multiple processes, and that interprocess communication is generally done by message passing through queues or pipes. A multiprocessing queue pickles every object put into it, and the docs note that the object returned by get is a re-created copy that shares no memory with the original. A module-level list appended in a child changes only the child's copy.

## Bad

```python
import multiprocessing

shared: list[int] = []


def worker(value: int) -> None:
    shared.append(value)


if __name__ == "__main__":
    process = multiprocessing.Process(target=worker, args=(1,))
    process.start()
    process.join()
    print(shared)
```

## Good

```python
import multiprocessing


def worker(value: int, sink: "multiprocessing.Queue[int]") -> None:
    sink.put(value)


if __name__ == "__main__":
    queue: multiprocessing.Queue = multiprocessing.Queue()
    process = multiprocessing.Process(target=worker, args=(1, queue))
    process.start()
    process.join()
    print(queue.get())
```

## See Also

- [python-conc-queue-exchange](conc-queue-exchange.md) - the thread-side version of this pattern
- [python-conc-spawn-safety](conc-spawn-safety.md) - why children get copies rather than the parent's objects
