---
id: rust-async-mpsc-queue
lang: rust
prefix: async
title: "Use `mpsc` channels for async message queues between tasks"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["mpsc", "queue", "channels", "async", "message", "queues", "between", "tasks"]
  files: ["**/*.rs"]
  symbols: ["mpsc"]
related: ["rust-async-bounded-channel", "rust-async-oneshot-response", "rust-async-broadcast-pubsub"]
sources:
  - title: "rust-skills: async-mpsc-queue"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-mpsc-queue.md
---
> Use `mpsc` channels for async message queues between tasks

## Why

`tokio::sync::mpsc` (multi-producer, single-consumer) is the workhorse channel for async Rust. It provides async send/receive, backpressure via bounded capacity, and efficient cloning of senders. It's the default choice for task-to-task communication.

## Bad

```rust
use std::sync::mpsc;  // Wrong! Blocks the async runtime

#[tokio::main]
async fn main() {
    let (tx, rx) = std::sync::mpsc::channel();

    tokio::spawn(async move {
        tx.send("hello").unwrap();  // Might block
    });

    tokio::spawn(async move {
        let msg = rx.recv().unwrap();  // BLOCKS the executor thread!
    });
}
```

## Good

```rust
use tokio::sync::mpsc;

#[tokio::main]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<String>(100);

    tokio::spawn(async move {
        tx.send("hello".to_string()).await.unwrap();
    });

    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            println!("Received: {}", msg);
        }
    });
}
```

## See Also

- [rust-async-bounded-channel](async-bounded-channel.md) - Why bounded channels
- [rust-async-oneshot-response](async-oneshot-response.md) - Request-response with oneshot
- [rust-async-broadcast-pubsub](async-broadcast-pubsub.md) - Multiple consumers
