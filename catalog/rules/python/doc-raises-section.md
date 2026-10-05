---
id: python-doc-raises-section
lang: python
prefix: doc
title: List the exceptions callers can expect in a Raises section
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [docstring, raises, exceptions, documentation]
  files: ["**/*.py"]
  symbols: [Raises]
related: [python-doc-args-section, python-err-custom-hierarchy]
sources:
  - title: Google Python Style Guide
    url: https://google.github.io/styleguide/pyguide.html
---

> List the exceptions the caller can expect in a Raises section.

## Why

The Google style guide instructs authors to list all exceptions that are relevant to the interface followed by a description, in the same hanging-indent style as Args. A caller cannot discover raised exceptions from the signature, so the docstring is the only place the contract can state them. Exceptions raised for violating the documented contract are the ones the guide says not to list.

## Bad

```python
import json


def parse(text: str) -> dict[str, object]:
    """Decode the text."""
    return json.loads(text)
```

## Good

```python
import json


def parse(text: str) -> dict[str, object]:
    """Decode the text.

    Raises:
        json.JSONDecodeError: If the payload is not valid JSON.
    """
    return json.loads(text)
```

## See Also

- [python-doc-args-section](doc-args-section.md) - the section style these lists follow
- [python-err-custom-hierarchy](err-custom-hierarchy.md) - choosing the exception types worth documenting
