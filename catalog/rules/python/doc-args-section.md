---
id: python-doc-args-section
lang: python
prefix: doc
title: Document each parameter in an Args section with its name and description
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [docstring, args, parameters, documentation]
  files: ["**/*.py"]
  symbols: [Args]
related: [python-doc-raises-section, python-doc-summary-imperative]
sources:
  - title: Google Python Style Guide
    url: https://google.github.io/styleguide/pyguide.html
---

> Document each parameter in an Args section with the name and a description.

## Why

The Google style guide says a docstring should give enough information to write a call to the function without reading its code, and its Args section lists each parameter by name with a description after a colon. The name-first layout lets readers scan parameters without parsing prose. The description carries what the signature does not, such as units, defaults, and accepted ranges.

## Bad

```python
def resize(width: int, height: int) -> tuple[int, int]:
    """Resize the image.

    Takes width and height and returns the new size.
    """
    return width, height
```

## Good

```python
def resize(width: int, height: int) -> tuple[int, int]:
    """Resize the image.

    Args:
        width: Target width in pixels.
        height: Target height in pixels.
    """
    return width, height
```

## See Also

- [python-doc-raises-section](doc-raises-section.md) - documenting the other part of the calling contract
- [python-doc-summary-imperative](doc-summary-imperative.md) - the summary line above these sections
