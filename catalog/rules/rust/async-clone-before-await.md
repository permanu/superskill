---
id: rust-async-clone-before-await
lang: rust
prefix: async
title: "Clone Arc/Rc data before await points to avoid holding references across suspension"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["clone", "await", "arc", "data", "points", "holding", "references", "across"]
  files: ["**/*.rs"]
related: ["rust-async-no-lock-await", "rust-own-arc-shared", "rust-async-spawn-blocking"]
sources:
  - title: "rust-skills: async-clone-before-await"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-clone-before-await.md
---
> Clone Arc/Rc data before await points to avoid holding references across suspension

## Why

References held across `.await` points extend the future's lifetime and can cause borrow checker issues or prevent `Send` bounds. Cloning `Arc`/`Rc` before the await ensures the future only holds owned data, making it `Send` and avoiding lifetime complications.

## Bad

```rust
use std::sync::Arc;

struct Item;
struct Data {
    items: Vec<Item>,
}

async fn expensive_async_operation() {}
fn use_slice(_slice: &[Item]) {}

async fn process(data: Arc<Data>) {
    // Borrow held across the await point: the future keeps `Data` alive
    // until `slice` is last used.
    let slice = &data.items[..];  // Borrow of Arc contents
    expensive_async_operation().await;  // Await with active borrow
    use_slice(slice);  // Still using the borrow
}

#[tokio::main]
async fn main() {
    let data = Arc::new(Data { items: vec![Item] });
    // If `Item` is not `Sync`, `&[Item]` is not `Send` and this spawn is
    // rejected with E0277 (future cannot be sent between threads safely).
    tokio::spawn(process(data));
}
```

## Good

```rust
use std::sync::Arc;

#[derive(Clone)]
struct Item;
struct Data {
    items: Vec<Item>,
}

async fn expensive_async_operation() {}
async fn some_async_work() {}
fn use_items(_items: &[Item]) {}

async fn process(data: Arc<Data>) {
    // Clone what you need before await
    let items = data.items.clone();  // Owned Vec
    expensive_async_operation().await;
    use_items(&items);  // Using owned data
}

// Or clone the Arc itself
async fn share_data(data: Arc<Data>) {
    let data = data.clone();  // Another Arc handle
    some_async_work().await;
    process(data).await;  // Safe - we own the Arc
}
```

## See Also

- [rust-async-no-lock-await](async-no-lock-await.md) - Lock guards across await
- [rust-own-arc-shared](own-arc-shared.md) - Arc usage patterns
- [rust-async-spawn-blocking](async-spawn-blocking.md) - Blocking in async
