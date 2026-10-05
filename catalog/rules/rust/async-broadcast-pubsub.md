---
id: rust-async-broadcast-pubsub
lang: rust
prefix: async
title: "Use `broadcast` channel for pub/sub where all subscribers receive all messages"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["broadcast", "pubsub", "channel", "pub", "sub", "subscribers", "receive", "messages"]
  files: ["**/*.rs"]
  symbols: ["broadcast"]
related: ["rust-async-mpsc-queue", "rust-async-watch-latest", "rust-async-bounded-channel"]
sources:
  - title: "rust-skills: async-broadcast-pubsub"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-broadcast-pubsub.md
---
> Use `broadcast` channel for pub/sub where all subscribers receive all messages

## Why

Unlike `mpsc` where one consumer receives each message, `broadcast` delivers each message to all subscribers. This is ideal for event broadcasting, real-time notifications, or when multiple components need to react to the same events independently.

## Bad

```rust
use tokio::sync::mpsc;

struct Event;

#[tokio::main]
async fn main() {
    // mpsc only delivers to ONE consumer
    let (tx, mut rx) = mpsc::channel::<Event>(100);

    // Only one of these receives each message!
    // let mut rx2 = rx.clone(); // error[E0599]: no method named `clone` found
    tx.send(Event).await.unwrap();
    let _first = rx.recv().await;
}
```

## Good

```rust
use tokio::sync::broadcast;

#[derive(Clone, Debug)]
enum Event { UserLogin { user_id: u64 } }

fn handle_in_logger(_event: Event) {}
fn handle_in_metrics(_event: Event) {}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // broadcast delivers every message to ALL subscribers
    let (tx, _) = broadcast::channel::<Event>(100);
    let mut rx1 = tx.subscribe();
    let mut rx2 = tx.subscribe();

    tokio::spawn(async move { while let Ok(e) = rx1.recv().await { handle_in_logger(e); } });
    tokio::spawn(async move { while let Ok(e) = rx2.recv().await { handle_in_metrics(e); } });

    tx.send(Event::UserLogin { user_id: 42 })?; // both subscribers receive this
    Ok(())
}
```

## See Also

- [rust-async-mpsc-queue](async-mpsc-queue.md) - Single-consumer channels
- [rust-async-watch-latest](async-watch-latest.md) - Latest-value only
- [rust-async-bounded-channel](async-bounded-channel.md) - Buffer sizing
