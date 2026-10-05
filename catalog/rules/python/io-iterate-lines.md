---
id: python-io-iterate-lines
lang: python
prefix: io
title: Iterate files line by line instead of materializing every line with readlines
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [readlines, iteration, lines, memory]
  files: ["**/*.py"]
  symbols: [readlines]
related: [python-data-encoding-explicit, python-perf-generator-stream]
sources:
  - title: io - Core tools for working with streams
    url: https://docs.python.org/3/library/io.html
---

> Iterate file objects line by line; readlines materializes every line in memory before the loop starts.

## Why

The io docs note that a file object supports the iterator protocol and can be iterated over yielding the lines in a stream, and state that iterating with for line in file works without calling file.readlines(). readlines builds a list of every line, so peak memory scales with the size of the file. Line-by-line iteration reads only as the loop consumes it.

## Bad

```python
def count_errors(path: str) -> int:
    with open(path, encoding="utf-8") as handle:
        return sum(1 for line in handle.readlines() if "ERROR" in line)
```

## Good

```python
def count_errors(path: str) -> int:
    with open(path, encoding="utf-8") as handle:
        return sum(1 for line in handle if "ERROR" in line)
```

## See Also

- [python-data-encoding-explicit](data-encoding-explicit.md) - naming the encoding on the same open call
- [python-perf-generator-stream](perf-generator-stream.md) - streaming instead of building the full collection
