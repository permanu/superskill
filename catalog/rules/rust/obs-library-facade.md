---
id: rust-obs-library-facade
lang: rust
prefix: obs
title: "Libraries emit through the tracing/log facade and never install a subscriber"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["library", "facade", "libraries", "emit", "through", "tracing", "log", "install"]
  files: ["**/*.rs"]
related: ["rust-obs-tracing-over-log", "rust-obs-levels-filter", "rust-api-serde-optional"]
sources:
  - title: "rust-skills: obs-library-facade"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/obs-library-facade.md
---
> Libraries emit through the tracing/log facade and never install a subscriber

## Why

Installing a global subscriber or logger is a one-time, process-wide operation. If a library calls `tracing_subscriber::fmt::init()` or `env_logger::init()`, it silently conflicts with any other library or the application binary that does the same — the second call panics or is silently ignored, and the caller loses all control over log format, destination, and level filtering. Libraries must only *emit* events and spans; the binary that owns `main` decides how to handle them. This is the same contract as `log` has always enforced and `tracing` carries forward.

## Bad

```rust
// In a library crate: mylib/src/lib.rs
use tracing::info;

pub fn connect(url: &str) {
    // BAD: library installs a subscriber — conflicts with the application
    tracing_subscriber::fmt::init();
    info!(url, "connecting");
}

// Also bad: using env_logger in a library
pub fn init_logging() {
    env_logger::init(); // steals the global logger from the application
}
```

## Good

```rust
// In a library crate: mylib/src/lib.rs
mod mylib {
    use tracing::info;

    pub fn connect(url: &str) {
        // Good: just emit; the application owns subscriber setup
        info!(url, "connecting");
    }
}

// In the binary: src/main.rs
fn main() {
    // The application initializes once, with full control
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    mylib::connect("postgres://localhost/app");
}
```

## See Also

- [rust-obs-tracing-over-log](obs-tracing-over-log.md) - Why to use `tracing` over `println!` or bare `log`
- [rust-obs-levels-filter](obs-levels-filter.md) - configure level filtering with `EnvFilter` in the binary
- [rust-api-serde-optional](api-serde-optional.md) - Pattern for gating heavy dependencies behind feature flags
