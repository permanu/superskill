---
id: rust-own-arc-shared
lang: rust
prefix: own
title: "Use `Arc<T>` for thread-safe shared ownership"
severity: should
enforce: review
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["arc", "shared", "thread-safe", "ownership"]
  files: ["**/*.rs"]
  symbols: ["Arc"]
related: ["rust-own-rc-single-thread", "rust-own-mutex-interior", "rust-async-clone-before-await", "rust-conc-scoped-threads", "rust-unsafe-send-sync-manual"]
sources:
  - title: "rust-skills: own-arc-shared"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/own-arc-shared.md
---
> Use `Arc<T>` for thread-safe shared ownership

## Why

> Note: the Bad snippet intentionally does not compile (demonstrates that `Rc` cannot be sent between threads).

`Arc` (Atomic Reference Counted) provides shared ownership across threads. Unlike `Rc`, its reference count is updated atomically, making it safe for concurrent access. Use it when multiple threads need to read the same data.

## Bad

```rust
use std::rc::Rc;
use std::thread;

let data = Rc::new(vec![1, 2, 3]);
let data_clone = Rc::clone(&data);

// ERROR: Rc cannot be sent between threads safely
thread::spawn(move || {
    println!("{:?}", data_clone);
});
```

## Good

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    let data = Arc::new(vec![1, 2, 3]);
    let data_clone = Arc::clone(&data);

    thread::spawn(move || {
        println!("{:?}", data_clone);  // Safe!
    });

    println!("{:?}", data);  // Original still accessible
}
```

## See Also

- [rust-own-rc-single-thread](own-rc-single-thread.md) - Use Rc for single-threaded sharing
- [rust-own-mutex-interior](own-mutex-interior.md) - Use Mutex for interior mutability
- [rust-async-clone-before-await](async-clone-before-await.md) - Clone Arc before await points
- [rust-conc-scoped-threads](conc-scoped-threads.md) - Borrow stack data instead of Arc
- [rust-unsafe-send-sync-manual](unsafe-send-sync-manual.md) - Document manual Send/Sync impls
