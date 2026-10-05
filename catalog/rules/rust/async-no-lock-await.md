---
id: rust-async-no-lock-await
lang: rust
prefix: async
title: "Never hold `Mutex`/`RwLock` across `.await`"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["lock", "await", "hold", "mutex", "rwlock", "across"]
  files: ["**/*.rs"]
  symbols: ["Mutex", "RwLock"]
related: ["rust-async-spawn-blocking", "rust-async-clone-before-await", "rust-anti-lock-across-await"]
sources:
  - title: "rust-skills: async-no-lock-await"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-no-lock-await.md
---
> Never hold `Mutex`/`RwLock` across `.await`

## Why

Holding a lock across an `.await` point can cause deadlocks and severely hurt performance. The task may be suspended while holding the lock, blocking all other tasks waiting for it - potentially indefinitely.

## Bad

```rust
use tokio::sync::Mutex;

struct State {
    value: Data,
    id: String,
}
struct Data;

async fn fetch_from_network() -> Data {
    Data
}

async fn bad_update(state: &Mutex<State>) {
    let mut guard = state.lock().await;
    
    // BAD: Lock held across await!
    let data = fetch_from_network().await;
    
    guard.value = data;
}  // Lock finally released

// This can deadlock or starve other tasks
```

## Good

```rust
use tokio::sync::Mutex;

struct State { value: Data, id: String }
struct Data;

async fn fetch_from_network() -> Data { Data }
async fn fetch_by_id(_id: String) -> Data { Data }

async fn good_update(state: &Mutex<State>) {
    // Fetch data BEFORE taking the lock
    let data = fetch_from_network().await;
    // Lock only for the quick update
    let mut guard = state.lock().await;
    guard.value = data;
}

// Alternative: clone data out, process, then update
async fn good_update_v2(state: &Mutex<State>) {
    let id = {
        let guard = state.lock().await;
        guard.id.clone()
    };  // Lock released!
    let data = fetch_by_id(id).await;
    state.lock().await.value = data;
}
```

## See Also

- [rust-async-spawn-blocking](async-spawn-blocking.md) - Use spawn_blocking for CPU work
- [rust-async-clone-before-await](async-clone-before-await.md) - Clone data before await
- [rust-anti-lock-across-await](anti-lock-across-await.md) - Anti-pattern reference
