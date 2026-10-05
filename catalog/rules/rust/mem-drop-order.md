---
id: rust-mem-drop-order
lang: rust
prefix: mem
title: "Know and control drop order: struct fields drop top-to-bottom, locals in reverse"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["drop", "order", "know", "control", "struct", "fields", "top-to-bottom", "locals"]
  files: ["**/*.rs"]
related: ["rust-test-fixture-raii", "rust-own-mutex-interior", "rust-mem-take-replace"]
sources:
  - title: "rust-skills: mem-drop-order"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-drop-order.md
---
> Know and control drop order: struct fields drop top-to-bottom, locals in reverse

## Why

Drop order is observable. RAII guards (mutex locks, file handles, database transactions, span guards) do meaningful work in their `Drop` implementations, and dropping them in the wrong order silently causes bugs: releasing a lock while a transaction that depends on it is still alive, closing a connection before its transaction has committed, or dropping a tracing span before the work it covers has finished. The rules are fixed and deterministic, but easy to overlook when fields and locals accumulate over time.

## Bad

```rust
use std::sync::{Mutex, MutexGuard};

struct DatabaseSession {
    // BUG: `guard` is declared first, so it drops FIRST.
    // But `guard` protects the connection — dropping the lock
    // before the transaction is committed lets another thread
    // see the connection in a partial state.
    guard: MutexGuard<'static, ()>,
    transaction: Transaction,
}

struct Transaction; // pretend this commits on drop

impl Drop for Transaction {
    fn drop(&mut self) {
        println!("transaction committed");
    }
}

// In this struct, `guard` drops before `transaction`, releasing the mutex while the transaction is still in-flight.
```

## Good

```rust
use std::sync::{Mutex, MutexGuard};

struct Transaction; // commits on drop

impl Drop for Transaction {
    fn drop(&mut self) {
        println!("transaction committed");
    }
}

struct DatabaseSession {
    // CORRECT: `transaction` is declared first, so it drops first
    // (commit happens), THEN `guard` drops (lock released).
    transaction: Transaction,
    guard: MutexGuard<'static, ()>,
}

// Fields drop in declaration order, so the field at the top of the struct drops first.
```

## See Also

- [rust-test-fixture-raii](test-fixture-raii.md) - use RAII pattern (Drop) for test cleanup
- [rust-own-mutex-interior](own-mutex-interior.md) - use `Mutex<T>` for interior mutability (multi-thread)
- [rust-mem-take-replace](mem-take-replace.md) - Use `mem::take` / `mem::replace` to move out of `&mut`
