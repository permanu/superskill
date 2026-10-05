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

## Worktree & caches
- Share download/build caches (`UV_CACHE_DIR`, `PIP_CACHE_DIR`, `POETRY_CACHE_DIR`, `PDM_CACHE_DIR`, `PIXI_CACHE_DIR`); never share a `.venv`.
- `.venv` stays per worktree: editable installs embed absolute paths, so a moved or shared venv breaks.
- `uv`'s default clone/hardlink linking makes per-worktree venvs cheap; `pip`'s cache is tarballs only.
- Never point caches into the repo; keep them under the platform cache root.
- Rebuild each worktree with `uv sync`/`pip install` against the shared cache; it is fast when the cache is warm.
