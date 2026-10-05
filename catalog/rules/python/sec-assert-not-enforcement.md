---
id: python-sec-assert-not-enforcement
lang: python
prefix: sec
title: Enforce security checks with real control flow and never with assert
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assert, authorization, optimization, checks]
  files: ["**/*.py"]
  symbols: [assert, PermissionError]
related: [python-sec-no-hardcoded-secrets]
sources:
  - title: Google Python Style Guide - Exceptions
    url: https://google.github.io/styleguide/pyguide.html
---

> Enforce access checks in real code; assert disappears under -O.

## Why

`assert` statements are removed when Python runs with optimization, so an authorization check written as an assertion silently stops running in that mode. Google's guide states that asserts must not be critical to application logic and should be removable without breaking the code. A security decision raises or returns on the normal path so it survives every run configuration.

## Bad

```python
def may_read(user: str) -> bool:
    assert user == "admin", "admin only"
    return True
```

## Good

```python
def may_read(user: str) -> bool:
    if user != "admin":
        raise PermissionError("admin only")
    return True
```

## See Also

- [python-sec-no-hardcoded-secrets](sec-no-hardcoded-secrets.md) - the other check that must hold in production, not just in tests
