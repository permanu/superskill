---
id: rust-obs-levels-filter
lang: rust
prefix: obs
title: "Use log levels meaningfully and filter with `EnvFilter` / `RUST_LOG`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["levels", "filter", "log", "meaningfully", "envfilter", "rust_log"]
  files: ["**/*.rs"]
  symbols: ["EnvFilter", "RUST_LOG"]
related: ["rust-obs-tracing-over-log", "rust-obs-library-facade"]
sources:
  - title: "rust-skills: obs-levels-filter"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/obs-levels-filter.md
---
> Use log levels meaningfully and filter with `EnvFilter` / `RUST_LOG`

## Why

Log levels exist to communicate urgency and to let operators tune verbosity without recompiling. Misusing them — emitting everything at `info!`, or leaving `debug!` output in hot paths in production — overwhelms aggregators and hides real signals. `tracing_subscriber::EnvFilter` reads the `RUST_LOG` environment variable and supports per-crate, per-target, and per-span directives, giving operators fine-grained control at runtime. For release builds, tracing's `max_level_*` Cargo features can compile out verbose levels entirely, eliminating even the call-site overhead.

## Bad

```rust
use tracing::info;

fn handle_request(path: &str, body: &[u8]) {
    // BAD: debug-level detail emitted at info — always noisy in production
    info!(path, body_len = body.len(), raw = ?body, "handling request");
    info!("entered handle_request");         // trace-level lifecycle noise
    info!("about to parse body");            // also trace-level
    // request handling logic happens between the lifecycle logs
    info!("done handling request");
}
```

## Good

```rust
use tracing::{debug, error, info, instrument, trace, warn};

#[instrument(skip(body))]
fn handle_request(path: &str, body: &[u8]) {
    trace!("entered handler");
    debug!(body_len = body.len(), "parsing body");
    info!(path, "request received");
    match parse_body(body) {
        Ok(parsed) => info!(items = parsed.len(), "request processed"),
        Err(e) if is_client_error(&e) => warn!(error = ?e, "malformed request"),
        Err(e) => error!(error = ?e, "unexpected parse failure"),
    }
}

fn parse_body(_body: &[u8]) -> Result<Vec<u8>, String> { Ok(vec![]) }
fn is_client_error(_e: &str) -> bool { false }

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,myapp=debug,hyper=warn".into()),
        )
        .init();
}
```

## See Also

- [rust-obs-tracing-over-log](obs-tracing-over-log.md) - Foundational `tracing` setup
- [rust-obs-library-facade](obs-library-facade.md) - Libraries emit events; binaries configure filtering
