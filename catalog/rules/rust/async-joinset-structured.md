---
id: rust-async-joinset-structured
lang: rust
prefix: async
title: "Use `JoinSet` for managing dynamic collections of spawned tasks"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["joinset", "structured", "managing", "dynamic", "collections", "spawned", "tasks"]
  files: ["**/*.rs"]
  symbols: ["JoinSet"]
related: ["rust-async-join-parallel", "rust-async-cancellation-token", "rust-async-try-join"]
sources:
  - title: "rust-skills: async-joinset-structured"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-joinset-structured.md
---
> Use `JoinSet` for managing dynamic collections of spawned tasks

## Why

When spawning a variable number of tasks, collecting `JoinHandle`s in a `Vec` and using `join_all` works but lacks flexibility. `JoinSet` provides a better abstraction: add/remove tasks dynamically, get results as they complete, and abort all on drop. It's the idiomatic way to manage task collections.

## Bad

```rust
use anyhow::Result;
use tokio::task::JoinHandle;

struct Data;

async fn fetch(_url: String) -> Result<Data> {
    Ok(Data)
}

#[tokio::main]
async fn main() {
    let urls = vec!["https://example.com".to_string()];
    let mut handles: Vec<JoinHandle<Result<Data>>> = Vec::new();
    for url in urls {
        handles.push(tokio::spawn(fetch(url)));
    }
    // Wait for all, in order (not as they complete)
    let results = futures::future::join_all(handles).await;
    // No easy way to cancel all, handle errors progressively, or add more tasks
    let _ = results;
}
```

## Good

```rust
use anyhow::Result;
use tokio::task::JoinSet;

struct Data;

async fn fetch(_url: String) -> Result<Data> { Ok(Data) }
fn process(_data: Data) {}

#[tokio::main]
async fn main() {
    let urls = vec!["https://example.com".to_string()];
    let mut set = JoinSet::new();
    for url in urls {
        set.spawn(fetch(url.clone()));
    }
    // Process results as they complete
    while let Some(result) = set.join_next().await {
        match result {
            Ok(Ok(data)) => process(data),
            Ok(Err(e)) => log::error!("Task failed: {}", e),
            Err(e) => log::error!("Task panicked: {}", e),
        }
    }
}
```

## See Also

- [rust-async-join-parallel](async-join-parallel.md) - Static concurrent futures
- [rust-async-cancellation-token](async-cancellation-token.md) - Cancellation patterns
- [rust-async-try-join](async-try-join.md) - Error handling in joins
