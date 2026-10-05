---
id: python-doc-cli-help
lang: python
prefix: doc
title: Fill in argparse description and help text
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [argparse, help, CLI, documentation]
  files: ["**/*.py"]
  symbols: [argparse.ArgumentParser]
related: [python-doc-args-section]
sources:
  - title: argparse - Parser for command-line options, arguments and subcommands
    url: https://docs.python.org/3/library/argparse.html
---

> Fill in argparse description and help text; the generated help is the CLI's documentation.

## Why

The argparse docs describe the module as making it easy to write user-friendly command-line interfaces and as automatically generating help and usage messages. The description argument gives a brief description of what the program does, and each argument's help is a brief description of what that argument does. Left empty, the generated help lists flags with no explanation.

## Bad

```python
import argparse


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers")
    parser.parse_args()
```

## Good

```python
import argparse


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the batch importer.")
    parser.add_argument("--workers", help="Number of worker processes.")
    parser.parse_args()
```

## See Also

- [python-doc-args-section](doc-args-section.md) - the same name-and-description shape for Python functions
