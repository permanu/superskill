---
id: rust-own-mutex-interior
lang: rust
prefix: own
title: "Use `Mutex<T>` for interior mutability across threads"
severity: should
enforce: review
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["mutex", "interior", "mutability", "across", "threads"]
  files: ["**/*.rs"]
  symbols: ["Mutex"]
related: ["rust-own-rwlock-readers", "rust-own-refcell-interior", "rust-async-no-lock-await", "rust-conc-atomic-ordering"]
sources:
  - title: "rust-skills: own-mutex-interior"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/own-mutex-interior.md
---
> Use `Mutex<T>` for interior mutability across threads

## Why

> Note: the Bad snippet intentionally does not compile (demonstrates that `RefCell` cannot be shared between threads safely).

When you need shared mutable state across threads, `Mutex<T>` provides safe interior mutability with synchronization. Unlike `RefCell`, `Mutex` is `Send + Sync` and uses OS-level locking to ensure only one thread can access the data at a time.

## Bad

```rust
use std::cell::RefCell;
use std::sync::Arc;

// RefCell is !Sync - this won't compile
let shared = Arc::new(RefCell::new(vec![]));

// ERROR: RefCell cannot be shared between threads safely
std::thread::spawn({
    let shared = shared.clone();
    move || shared.borrow_mut().push(1)
});
```

## Good

```rust
use std::sync::{Arc, Mutex};

fn main() {
    let shared = Arc::new(Mutex::new(vec![]));

    let handles: Vec<_> = (0..10).map(|i| {
        let shared = shared.clone();
        std::thread::spawn(move || {
            let mut data = shared.lock().unwrap();
            data.push(i);
        })
    }).collect();

    for handle in handles {
        handle.join().unwrap();
    }

    println!("{:?}", shared.lock().unwrap()); // All values present
}
```

## See Also

- [rust-own-rwlock-readers](own-rwlock-readers.md) - When reads dominate writes
- [rust-own-refcell-interior](own-refcell-interior.md) - Single-threaded alternative
- [rust-async-no-lock-await](async-no-lock-await.md) - Avoiding locks across await points
- [rust-conc-atomic-ordering](conc-atomic-ordering.md) - Lock-free alternative for simple state
