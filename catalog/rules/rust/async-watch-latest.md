---
id: rust-async-watch-latest
lang: rust
prefix: async
title: "Use `watch` channel for sharing the latest value with multiple observers"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["watch", "latest", "channel", "sharing", "value", "multiple", "observers"]
  files: ["**/*.rs"]
  symbols: ["watch"]
related: ["rust-async-broadcast-pubsub", "rust-async-mpsc-queue", "rust-async-cancellation-token"]
sources:
  - title: "rust-skills: async-watch-latest"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-watch-latest.md
---
> Use `watch` channel for sharing the latest value with multiple observers

## Why

`watch` is optimized for scenarios where receivers only care about the most recent value, not the history of changes. Unlike `broadcast`, slow receivers don't lag—they simply skip intermediate values. This is perfect for configuration, state, or status that should always reflect the current situation.

## Bad

```rust
use tokio::sync::{broadcast, mpsc};

#[derive(Clone)]
struct Config;
struct Status;

fn main() {
    // Using broadcast when only latest value matters
    let (tx, _) = broadcast::channel::<Config>(100);

    // Receivers might process stale configs if they're slow
    // And they waste time processing intermediate values

    // Using mpsc with buffered stale values
    let (tx, mut rx) = mpsc::channel::<Status>(100);
    // Receiver might process outdated statuses
    let _ = (tx, rx);
}
```

## Good

```rust
use tokio::sync::watch;

#[derive(Clone, Debug)]
struct Config;

impl Config {
    fn default() -> Self { Config }
    fn new() -> Self { Config }
}

fn apply_config(_config: &Config) {}

#[tokio::main]
async fn main() {
    let (tx, rx) = watch::channel(Config::default());
    // Two independent observers of the latest value
    for mut rx in [rx.clone(), rx.clone()] {
        tokio::spawn(async move {
            while rx.changed().await.is_ok() {
                apply_config(&rx.borrow());
            }
        });
    }
    tx.send(Config::new()).unwrap();
}
```

## See Also

- [rust-async-broadcast-pubsub](async-broadcast-pubsub.md) - When history matters
- [rust-async-mpsc-queue](async-mpsc-queue.md) - Work queue patterns
- [rust-async-cancellation-token](async-cancellation-token.md) - Related pattern
