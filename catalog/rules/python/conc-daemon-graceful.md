---
id: python-conc-daemon-graceful
lang: python
prefix: conc
title: Keep work that must finish on non-daemon threads
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [daemon, threads, shutdown, cleanup]
  files: ["**/*.py"]
  symbols: [threading.Thread.daemon]
related: [python-conc-join-threads, python-conc-event-signaling]
sources:
  - title: threading - Thread-based parallelism
    url: https://docs.python.org/3/library/threading.html
---

> Keep work that must finish on non-daemon threads; daemon threads are stopped abruptly at shutdown.

## Why

The threading docs warn that daemon threads are abruptly stopped at shutdown and that their resources, such as open files and database transactions, may not be released properly, and they recommend non-daemonic threads with a signalling mechanism for graceful stops. The docs also note that the entire program exits when no alive non-daemon threads are left. Marking a writer or flusher as a daemon trades its completion guarantee for a quicker exit.

## Bad

```python
import threading
import time


def flush() -> None:
    time.sleep(0.1)
    print("flushed")


threading.Thread(target=flush, daemon=True).start()
```

## Good

```python
import threading
import time


def flush() -> None:
    time.sleep(0.1)
    print("flushed")


worker = threading.Thread(target=flush)
worker.start()
worker.join()
```

## See Also

- [python-conc-join-threads](conc-join-threads.md) - waiting for the threads you start
- [python-conc-event-signaling](conc-event-signaling.md) - the signalling mechanism the docs recommend
