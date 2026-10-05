---
id: rust-obs-tracing-over-log
lang: rust
prefix: obs
title: "Use `tracing` for structured, span-aware diagnostics instead of `println!` or bare `log`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["tracing", "log", "structured", "span-aware", "diagnostics", "println", "bare"]
  files: ["**/*.rs"]
  symbols: ["tracing", "println", "log"]
related: ["rust-obs-structured-fields", "rust-obs-instrument-spans", "rust-async-tokio-runtime"]
sources:
  - title: "rust-skills: obs-tracing-over-log"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/obs-tracing-over-log.md
---
> Use `tracing` for structured, span-aware diagnostics instead of `println!` or bare `log`

## Why

`println!` and `eprintln!` have no concept of log levels, targets, or structured data — they cannot be silenced, filtered, or parsed by observability pipelines. The `log` facade improves this but emits only flat strings and has no notion of spans. `tracing` records both *events* (point-in-time observations) and *spans* (contextual scopes that automatically follow execution across `.await` points and threads), with structured key-value fields, level filtering, and target routing. It is also interoperable with the `log` ecosystem via `tracing`'s `log` feature flag.

## Bad

```rust
fn handle_login(id: u64) {
    println!("user {} logged in", id);
    // No level, no structure, no filtering, goes to stdout unconditionally
}

fn main() {
    handle_login(42);
}
```

## Good

```rust
use tracing::info;

fn handle_login(id: u64) {
    // Structured field: user.id is queryable in JSON/OpenTelemetry backends
    info!(user.id = %id, "user logged in");
}

fn main() {
    // One-time subscriber init belongs in the binary, not in libraries
    tracing_subscriber::fmt::init();
    handle_login(42);
}
```

## See Also

- [rust-obs-structured-fields](obs-structured-fields.md) - Record key-value fields, not interpolated strings
- [rust-obs-instrument-spans](obs-instrument-spans.md) - Attach context to async tasks with spans
- [rust-async-tokio-runtime](async-tokio-runtime.md) - Production async runtime setup
