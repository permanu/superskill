---
id: python-doc-summary-imperative
lang: python
prefix: doc
title: Write the summary as an imperative phrase ending in a period
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [docstring, summary, imperative, PEP 257]
  files: ["**/*.py"]
  symbols: [__doc__]
related: [python-doc-blank-after-summary, python-doc-docstring-public]
sources:
  - title: PEP 257 - Docstring Conventions
    url: https://peps.python.org/pep-0257/
  - title: The Python Tutorial - More Control Flow Tools
    url: https://docs.python.org/3/tutorial/controlflow.html
---

> Write the summary as an imperative phrase ending in a period, not a description.

## Why

PEP 257 says the one-line docstring is a phrase ending in a period that prescribes the function's effect as a command such as "Return that", not as a description, and warns against writing "Returns the pathname". The tutorial adds that the first line should be a short, concise summary beginning with a capital letter and ending with a period, and that it should not repeat the object's name or type. The summary line is what indexing tools and help listings show.

## Bad

```python
def retry() -> None:
    """Retries the request."""
    print("retry")
```

## Good

```python
def retry() -> None:
    """Retry the request."""
    print("retry")
```

## See Also

- [python-doc-blank-after-summary](doc-blank-after-summary.md) - what follows the summary line
- [python-doc-docstring-public](doc-docstring-public.md) - which callables get a summary at all
