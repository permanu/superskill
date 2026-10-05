---
id: rust-own-rwlock-readers
lang: rust
prefix: own
title: "Use `RwLock<T>` when reads significantly outnumber writes"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["rwlock", "readers", "reads", "significantly", "outnumber", "writes"]
  files: ["**/*.rs"]
  symbols: ["RwLock"]
related: ["rust-own-mutex-interior", "rust-async-no-lock-await"]
sources:
  - title: "rust-skills: own-rwlock-readers"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/own-rwlock-readers.md
---
> Use `RwLock<T>` when reads significantly outnumber writes

## Why

`Mutex<T>` allows only one thread to access data at a time, even for reads. `RwLock<T>` allows multiple concurrent readers OR one exclusive writer. For read-heavy workloads, this dramatically improves throughput by eliminating unnecessary serialization of read operations.

## Bad

```rust
use std::sync::{Arc, Mutex};

struct Config {
    value: String,
}

// Configuration rarely changes but is read constantly
fn get_setting(config: &Mutex<Config>, _key: &str) -> String {
    let guard = config.lock().unwrap();
    guard.value.clone()
}

fn main() {
    let config = Arc::new(Mutex::new(Config { value: String::new() }));
    println!("{}", get_setting(&config, "key"));
    // Every read blocks every other read
}
```

## Good

```rust
use std::sync::{Arc, RwLock};

struct Config {
    value: String,
}

fn get_setting(config: &RwLock<Config>, _key: &str) -> String {
    let guard = config.read().unwrap(); // multiple readers proceed concurrently
    guard.value.clone()
}

fn update_setting(config: &RwLock<Config>, _key: &str, value: &str) {
    let mut guard = config.write().unwrap(); // exclusive access for writes
    guard.value = value.to_string();
}

fn main() {
    let config = Arc::new(RwLock::new(Config { value: String::new() }));
    update_setting(&config, "key", "value");
    println!("{}", get_setting(&config, "key"));
}
```

## See Also

- [rust-own-mutex-interior](own-mutex-interior.md) - When writes are frequent
- [rust-async-no-lock-await](async-no-lock-await.md) - RwLock in async contexts
