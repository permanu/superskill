---
id: rust-obs-error-chain
lang: rust
prefix: obs
title: "Log errors with their full source chain, and log each error exactly once"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["error", "chain", "log", "errors", "full", "source", "exactly", "once"]
  files: ["**/*.rs"]
related: ["rust-err-context-chain", "rust-err-source-chain", "rust-anti-empty-catch"]
sources:
  - title: "rust-skills: obs-error-chain"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/obs-error-chain.md
---
> Log errors with their full source chain, and log each error exactly once

## Why

Logging only the top-level `Display` of an error silently drops the underlying cause chain — you see "request failed" but not *why*. The two common fixes are: use `?` format (`error = ?err`) to capture `Debug` output including the chain, or use `{:#}` on an `anyhow::Error` which formats the full cause chain. The second hazard is the log-and-return anti-pattern: logging the error at every propagation layer records the same failure multiple times with different amounts of context, polluting aggregators. Log once, at the boundary that *handles* the error; everywhere else, propagate with `?` and optionally add context.

## Bad

```rust
use tracing::error;

async fn fetch_data(id: u64) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let data = read_from_db(id).await.map_err(|e| {
        error!("{}", e);  // BAD: drops source chain, logs too early
        e
    })?;
    Ok(data)
}

async fn handle(id: u64) -> Result<(), Box<dyn std::error::Error>> {
    let data = fetch_data(id).await.map_err(|e| {
        error!("{}", e);  // BAD: logged again at every layer
        e
    })?;
    process(data);
    Ok(())
}

async fn read_from_db(_id: u64) -> Result<Vec<u8>, std::io::Error> {
    Err(std::io::Error::other("connection refused"))
}
fn process(_data: Vec<u8>) {}
```

## Good

```rust
use anyhow::{Context, Result};
use tracing::{error, instrument};

// Propagate with context; do NOT log here
async fn read_from_db(id: u64) -> Result<Vec<u8>> {
    db_read(id).await.with_context(|| format!("failed to read record {id}"))
}

// Handler boundary: log the error exactly once
#[instrument]
async fn handle_request(id: u64) -> Result<(), String> {
    match read_from_db(id).await {
        Ok(data) => { process(data); Ok(()) }
        Err(err) => {
            // {:#} prints the full anyhow cause chain
            error!(error = %format!("{err:#}"), "request failed");
            Err("internal error".to_string())
        }
    }
}

async fn db_read(_id: u64) -> Result<Vec<u8>> {
    Err(anyhow::anyhow!("connection refused"))
}
fn process(_data: Vec<u8>) {}
```

## See Also

- [rust-err-context-chain](err-context-chain.md) - Add context with `.context()` / `.with_context()`
- [rust-err-source-chain](err-source-chain.md) - Chain underlying errors with `#[source]`
- [rust-anti-empty-catch](anti-empty-catch.md) - Avoid silently swallowing errors
