---
id: rust-async-oneshot-response
lang: rust
prefix: async
title: "Use `oneshot` channel for request-response patterns"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["oneshot", "response", "channel", "request-response", "patterns"]
  files: ["**/*.rs"]
  symbols: ["oneshot"]
related: ["rust-async-mpsc-queue", "rust-async-bounded-channel", "rust-async-select-racing"]
sources:
  - title: "rust-skills: async-oneshot-response"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-oneshot-response.md
---
> Use `oneshot` channel for request-response patterns

## Why

When one task needs to send a request and wait for exactly one response, `oneshot` is the perfect fit. It's a single-use channel optimized for this pattern—no buffering, no clone overhead. Combined with `mpsc`, it enables clean actor-style message passing.

## Bad

```rust
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, Mutex};

struct Response;

async fn send_request() {}
async fn send_request_shared(_state: Arc<Mutex<Option<Response>>>) {}

#[tokio::main]
async fn main() {
    // Using mpsc for single response - wasteful
    let (tx, mut rx) = mpsc::channel::<Response>(1);
    send_request().await;
    let response = rx.recv().await.unwrap();
    // Channel persists, could accidentally receive more
    let _ = (tx, response);

    // Using shared state - complex
    let result = Arc::new(Mutex::new(None));
    send_request_shared(result.clone()).await;
    while result.lock().await.is_none() {
        tokio::time::sleep(Duration::from_millis(10)).await;  // Polling!
    }
}
```

## Good

```rust
use tokio::sync::oneshot;

struct Response;
struct Request {
    data: String,
    reply: oneshot::Sender<Response>,
}

async fn send_request(_request: Request) {}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let (tx, rx) = oneshot::channel::<Response>();

    // Send request with reply channel
    send_request(Request { data: String::new(), reply: tx }).await;

    // Wait for response
    let response = rx.await?;
    let _ = response;

    // Channel is consumed - can't accidentally reuse
    Ok(())
}
```

## See Also

- [rust-async-mpsc-queue](async-mpsc-queue.md) - Pair with oneshot for request-response
- [rust-async-bounded-channel](async-bounded-channel.md) - Channel sizing
- [rust-async-select-racing](async-select-racing.md) - Timeout patterns
