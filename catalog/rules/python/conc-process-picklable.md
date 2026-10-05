---
id: python-conc-process-picklable
lang: python
prefix: conc
title: Give child processes importable functions and picklable arguments
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pickle, Process, target, spawn]
  files: ["**/*.py"]
  symbols: [multiprocessing.Process]
related: [python-conc-spawn-safety, python-conc-main-guard]
sources:
  - title: multiprocessing - Process-based parallelism
    url: https://docs.python.org/3/library/multiprocessing.html
---

> Give children importable functions and picklable arguments; a lambda or REPL target dies on spawn.

## Why

The multiprocessing docs state that all arguments to Process must be picklable and that the target must have been defined within an importable module so it can be loaded during unpickling. A lambda or a function defined in an interactive session fails in the child with an AttributeError that the parent cannot catch. Module-level functions and data-only arguments work with every start method.

## Bad

```python
import multiprocessing


if __name__ == "__main__":
    square = lambda value: value * value
    process = multiprocessing.Process(target=square, args=(3,))
    process.start()
    process.join()
```

## Good

```python
import multiprocessing


def square(value: int) -> None:
    print(value * value)


if __name__ == "__main__":
    process = multiprocessing.Process(target=square, args=(3,))
    process.start()
    process.join()
```

## See Also

- [python-conc-spawn-safety](conc-spawn-safety.md) - the start methods that enforce this rule
- [python-conc-main-guard](conc-main-guard.md) - making the main module importable for children
