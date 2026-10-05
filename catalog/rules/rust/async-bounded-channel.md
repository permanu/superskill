---
id: rust-async-bounded-channel
lang: rust
prefix: async
title: "Use bounded channels to apply backpressure and prevent unbounded memory growth"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["bounded", "channel", "channels", "apply", "backpressure", "prevent", "unbounded", "memory"]
  files: ["**/*.rs"]
related: ["rust-async-mpsc-queue", "rust-async-oneshot-response", "rust-async-watch-latest"]
sources:
  - title: "rust-skills: async-bounded-channel"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-bounded-channel.md
---
> Use bounded channels to apply backpressure and prevent unbounded memory growth

## Why

Unbounded channels grow without limit when producers outpace consumers. In production, this leads to memory exhaustion. Bounded channels apply backpressure—producers wait when the channel is full, naturally throttling the system. This prevents OOM and makes resource usage predictable.

## Bad

```rust
use tokio::sync::mpsc;

struct Message;

#[tokio::main]
async fn main() {
    // Unbounded channel: memory can grow forever
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();
    // Fast producer: never blocks until OOM
    tokio::spawn(async move {
        loop {
            tx.send(Message).unwrap();
        }
    });
    // Consumer is slower than the producer
    while let Some(_msg) = rx.recv().await {
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }
}
```

## Good

```rust
use tokio::sync::mpsc;

struct Message;

#[tokio::main]
async fn main() {
    // Bounded channel: at most 100 messages in flight
    let (tx, mut rx) = mpsc::channel::<Message>(100);
    // Backpressure: producer awaits when the channel is full
    tokio::spawn(async move {
        loop {
            tx.send(Message).await.unwrap();
        }
    });
    // Consumer is slower, so the channel fills and throttles the producer
    while let Some(_msg) = rx.recv().await {
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }
}
```

## See Also

- [rust-async-mpsc-queue](async-mpsc-queue.md) - Multi-producer patterns
- [rust-async-oneshot-response](async-oneshot-response.md) - Request-response pattern
- [rust-async-watch-latest](async-watch-latest.md) - Latest-value broadcasting
