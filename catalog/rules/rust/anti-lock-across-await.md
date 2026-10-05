---
id: rust-anti-lock-across-await
lang: rust
prefix: anti
title: "Don't hold locks across await points"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["lock", "across", "await", "don", "hold", "locks", "points"]
  files: ["**/*.rs"]
related: ["rust-async-no-lock-await", "rust-async-clone-before-await", "rust-own-mutex-interior"]
sources:
  - title: "rust-skills: anti-lock-across-await"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-lock-across-await.md
---
> Don't hold locks across await points

## Why

Holding a `Mutex` or `RwLock` guard across an `.await` causes the lock to be held while the task is suspended. Other tasks waiting for the lock block indefinitely. With `std::sync::Mutex`, this is even worse—it can deadlock the entire runtime.

## Bad

```rust
use std::sync::Mutex;
use tokio::sync::Mutex as AsyncMutex;

async fn do_async_work() {}

async fn slow_network_call() {}

// DEADLOCK RISK: std::sync::Mutex held across await
async fn bad_std_mutex(data: &Mutex<Vec<i32>>) {
    let mut guard = data.lock().unwrap();
    do_async_work().await;  // Lock held during await!
    guard.push(42);
}

// BLOCKS OTHER TASKS: tokio Mutex held across await
async fn bad_async_mutex(data: &AsyncMutex<Vec<i32>>) {
    let mut guard = data.lock().await;
    slow_network_call().await;  // Lock held for entire call!
    guard.push(42);
}
```

## Good

```rust
use std::sync::Mutex;
use tokio::sync::Mutex as AsyncMutex;

async fn do_async_work(value: Option<i32>) -> i32 { value.unwrap_or(0) }
async fn slow_network_call() -> i32 { 0 }

// Release lock before await
async fn good_approach(data: &Mutex<Vec<i32>>) {
    let value = {
        let guard = data.lock().unwrap();
        guard.last().copied()
    };  // Lock released here
    let result = do_async_work(value).await;
    {
        let mut guard = data.lock().unwrap();
        guard.push(result);
    }
}

// Minimize lock scope with async mutex
async fn good_async_mutex(data: &AsyncMutex<Vec<i32>>, item: i32) {
    data.lock().await.push(item);  // Quick lock, quick release
    let result = slow_network_call().await;  // Async work without lock
    data.lock().await.push(result);  // Quick lock again
}
```

## See Also

- [rust-async-no-lock-await](async-no-lock-await.md) - Async lock patterns
- [rust-async-clone-before-await](async-clone-before-await.md) - Clone pattern
- [rust-own-mutex-interior](own-mutex-interior.md) - Mutex usage
