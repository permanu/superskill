---
id: rust-conc-atomic-ordering
lang: rust
prefix: conc
title: "Use the weakest correct memory `Ordering` for every atomic operation"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["atomic", "ordering", "weakest", "correct", "memory", "operation"]
  files: ["**/*.rs"]
  symbols: ["Ordering"]
related: ["rust-own-mutex-interior", "rust-test-loom-concurrency", "rust-conc-scoped-threads"]
sources:
  - title: "rust-skills: conc-atomic-ordering"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/conc-atomic-ordering.md
---
> Use the weakest correct memory `Ordering` for every atomic operation

## Why

Defaulting to `SeqCst` (sequentially consistent) on every atomic is a common correctness-first shortcut, but it carries real cost: on x86 the difference is small, but on ARM and RISC-V weaker orderings map to cheaper instructions while `SeqCst` requires full memory barriers. More importantly, choosing the wrong ordering — even a weaker one — is a correctness bug that causes data races the compiler won't catch. Understanding the four practical levels lets you write both correct and efficient concurrent code.

## Bad

```rust
use std::sync::atomic::{AtomicU64, AtomicBool, Ordering};

static COUNTER: AtomicU64 = AtomicU64::new(0);
static READY: AtomicBool = AtomicBool::new(false);
static mut DATA: u64 = 0;

// SeqCst everywhere — correct, but unnecessarily expensive
fn increment() {
    COUNTER.fetch_add(1, Ordering::SeqCst);
}

fn producer() {
    unsafe { DATA = 42; }
    READY.store(true, Ordering::SeqCst); // overkill for a single flag
}

fn consumer() -> Option<u64> {
    if READY.load(Ordering::SeqCst) {
        Some(unsafe { DATA })
    } else {
        None
    }
}
```

## Good

```rust
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

static COUNTER: AtomicU64 = AtomicU64::new(0);
static READY: AtomicBool = AtomicBool::new(false);
static VALUE: AtomicU64 = AtomicU64::new(0);

// Relaxed: no cross-thread ordering needed for an independent counter.
fn increment() { COUNTER.fetch_add(1, Ordering::Relaxed); }

// Acquire/Release: publish the payload with Release, then synchronize
// on Acquire; the consumer sees the write that happened before it.
fn producer(value: u64) {
    VALUE.store(value, Ordering::Relaxed);
    READY.store(true, Ordering::Release);
}
fn consumer() -> Option<u64> {
    if READY.load(Ordering::Acquire) {
        Some(VALUE.load(Ordering::Relaxed))
    } else {
        None
    }
}

// SeqCst only when several atomics need one total order.
```

## See Also

- [rust-own-mutex-interior](own-mutex-interior.md) - prefer `Mutex<T>` when lock-free isn't required
- [rust-test-loom-concurrency](test-loom-concurrency.md) - Exhaustively test concurrent code with loom
- [rust-conc-scoped-threads](conc-scoped-threads.md) - Safely share stack data across threads
