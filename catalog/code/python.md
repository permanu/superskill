---
name: python
pack: code
langs: [python]
triggers: [python, django, pytest, mypy, ruff]
---

# Python (staff)

- Type hints on public functions. No mutable default args. Context managers for files/locks.
- `pathlib`, stdlib first. SQL bound parameters. Django: queries in one place, not scattered in views.
- Raise specific errors. Do not `except Exception: pass`.
- Pytest for behavior. `ruff`/`mypy` if the repo already has them.

## When
Python/Django repos on this Mac. Do not introduce Django into a Node repo.
