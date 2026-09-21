---
name: rust
pack: code
langs: [rust]
triggers: [rust, cargo, tokio, anyhow, thiserror, clippy, borrow, lifetime]
---

# Rust (staff, not "it compiles")

Drawn from how strong Rust code is actually written (ownership first, thiserror/anyhow split, cancel-safe async) — not a 200-rule dump. This Mac: backends, CLIs, Tauri **macOS**. Not WinUI.

## Defaults
- Libs: `Result<T, E>`, `thiserror`. Bins: `anyhow` at the edge. `?` with context. No `unwrap`/`expect` in library code except a proven invariant plus message.
- Borrow (`&T`, `&str`, `&[T]`) unless you must store or consume. `clone()` is fine for small IDs; not to silence the borrow checker on a hot path.
- Illegal states: enums, not bool soup. Newtypes when `f64` would mix units.
- `clippy` + `rustfmt` are the style guide.

## Edge cases people miss
- **Cancel safety (tokio):** do not `.await` while holding a `Mutex`. Prefer `tokio::sync` and short critical sections. `spawn_blocking` for CPU; async for IO.
- **One runtime.** Do not mix `async-std` into a tokio crate.
- **Lock + disk:** hold the lock across the full read-modify-write. Atomic write: write temp → `sync_all` → rename (same as our graph.json).
- **UTF-8:** truncate with `.chars()`, not bytes. PID reuse: store start time, not just pid.
- **FFI / Tauri:** command bodies stay thin; domain in a lib crate so `cargo test` runs without the webview. `unsafe` is a tiny documented block.
- **serde:** `deny_unknown_fields` on external input. Version file formats.

## When
Writing or reviewing `Cargo.toml`, axum/tokio, Tauri commands, native cores. If the crate already has Actix/Tonic, stay there.

## Verify
`cargo test`, `cargo clippy --all-targets`, `cargo fmt --check`. Table-driven tests for parsers and error paths. No network in unit tests.
