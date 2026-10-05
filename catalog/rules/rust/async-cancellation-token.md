---
id: rust-async-cancellation-token
lang: rust
prefix: async
title: "Use `CancellationToken` for graceful shutdown and task cancellation"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["cancellation", "token", "cancellationtoken", "graceful", "shutdown", "task"]
  files: ["**/*.rs"]
  symbols: ["CancellationToken"]
related: ["rust-async-joinset-structured", "rust-async-select-racing", "rust-async-tokio-runtime"]
sources:
  - title: "rust-skills: async-cancellation-token"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-cancellation-token.md
---
> Use `CancellationToken` for graceful shutdown and task cancellation

## Why

Dropping a `JoinHandle` doesn't cancel the task—it just detaches it. For graceful shutdown, you need explicit cancellation. `tokio_util::sync::CancellationToken` provides a cooperative cancellation mechanism that tasks can check and respond to, enabling clean resource cleanup.

## Bad

```rust
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

async fn do_work() {}

#[tokio::main]
async fn main() {
    // Dropping the JoinHandle detaches the task; it keeps running.
    let handle = tokio::spawn(async {
        loop { do_work().await; }
    });
    drop(handle);
    // A bool flag is not async-aware: no wake-up while blocked in do_work.
    let running = Arc::new(AtomicBool::new(true));
    tokio::spawn({
        let running = running.clone();
        async move {
            while running.load(Ordering::Relaxed) {
                do_work().await;
            }
        }
    });
    running.store(false, Ordering::Relaxed);
}
```

## Good

```rust
use tokio_util::sync::CancellationToken;

async fn do_work() {}
async fn cleanup() {}

#[tokio::main]
async fn main() {
    let token = CancellationToken::new();
    let handle = tokio::spawn({
        let token = token.clone();
        async move {
            loop {
                tokio::select! {
                    _ = token.cancelled() => {
                        cleanup().await;
                        break;  // shutdown requested; stop the loop
                    }
                    _ = do_work() => {}
                }
            }
        }
    });
    token.cancel();  // ask the task to stop
    handle.await.unwrap();  // task completes cleanly
}
```

## See Also

- [rust-async-joinset-structured](async-joinset-structured.md) - Managing multiple tasks
- [rust-async-select-racing](async-select-racing.md) - Select! for cancellation
- [rust-async-tokio-runtime](async-tokio-runtime.md) - Runtime shutdown
