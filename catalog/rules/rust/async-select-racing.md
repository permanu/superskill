---
id: rust-async-select-racing
lang: rust
prefix: async
title: "Use `select!` to race futures and handle the first to complete"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["select", "racing", "race", "futures", "handle", "first", "complete"]
  files: ["**/*.rs"]
  symbols: ["select"]
related: ["rust-async-cancellation-token", "rust-async-join-parallel", "rust-async-bounded-channel"]
sources:
  - title: "rust-skills: async-select-racing"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-select-racing.md
---
> Use `select!` to race futures and handle the first to complete

## Why

Sometimes you need the first result from multiple futures—timeout vs operation, cancellation vs work, or competing alternatives. `tokio::select!` lets you race futures and handle whichever completes first, while properly cancelling the others.

## Bad

```rust
use std::time::{Duration, Instant};

struct Data;

async fn fetch_primary() -> Result<Data, ()> { Ok(Data) }
async fn fetch_fallback() -> Result<Data, ()> { Ok(Data) }

// Can't express "whichever finishes first"
async fn fetch_with_fallback() -> Data {
    match fetch_primary().await {
        Ok(data) => data,
        Err(_) => fetch_fallback().await.unwrap(),  // Sequential, not racing
    }
}

// Manual timeout is error-prone
async fn fetch_with_timeout() -> Option<Data> {
    let start = Instant::now();
    loop {
        if start.elapsed() > Duration::from_secs(5) {
            return None;
        }
    }
}
```

## Good

```rust
use std::time::Duration;
use tokio::select;

struct Data;

#[derive(Debug)]
enum Error { Timeout }

async fn fetch_primary() -> Result<Data, Error> { Ok(Data) }
async fn fetch_fallback() -> Result<Data, Error> { Ok(Data) }

async fn fetch_with_timeout() -> Result<Data, Error> {
    select! {
        result = fetch_primary() => result,
        _ = tokio::time::sleep(Duration::from_secs(5)) => Err(Error::Timeout),
    }
}

async fn fetch_with_fallback() -> Data {
    select! {
        result = fetch_primary() => result.unwrap(),
        _ = tokio::time::sleep(Duration::from_secs(1)) => fetch_fallback().await.unwrap(),
    }
}
```

## See Also

- [rust-async-cancellation-token](async-cancellation-token.md) - Cancellation patterns
- [rust-async-join-parallel](async-join-parallel.md) - All futures, not racing
- [rust-async-bounded-channel](async-bounded-channel.md) - Channel operations in select
