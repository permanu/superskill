---
id: rust-conc-thread-local
lang: rust
prefix: conc
title: "Prefer `thread_local!` with `Cell`/`RefCell` over `static mut`"
severity: must
enforce: review
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["thread", "local", "thread_local", "cell", "refcell", "static", "mut"]
  files: ["**/*.rs"]
  symbols: ["thread_local", "Cell", "RefCell"]
related: ["rust-own-refcell-interior", "rust-own-mutex-interior"]
sources:
  - title: "rust-skills: conc-thread-local"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/conc-thread-local.md
---
> Prefer `thread_local!` with `Cell`/`RefCell` over `static mut`

## Why

> Note: the Bad snippet intentionally does not compile (demonstrates the `static_mut_refs` hard error that taking a reference to a `static mut` triggers in the 2024 edition).

`static mut` requires `unsafe` at every access and is undefined behavior if any two threads touch it simultaneously — the compiler cannot rule that out. In Rust 2024, taking a shared or mutable reference to a `static mut` is a hard error (`static_mut_refs`). `thread_local!` gives each thread its own independent copy of the value, accessed through safe APIs via `Cell` (for `Copy` types) or `RefCell` (for anything else), with no synchronization overhead and no unsafe code needed.

## Bad

```rust
// Rust 2024: referencing static mut is a hard error (static_mut_refs lint)
static mut BUFFER: Vec<u8> = Vec::new();

fn append_to_buffer(data: &[u8]) {
    // UB if called from multiple threads; hard error in 2024 edition
    unsafe {
        BUFFER.extend_from_slice(data);
    }
}

fn flush_buffer() -> Vec<u8> {
    unsafe {
        std::mem::take(&mut BUFFER) // still requires unsafe
    }
}
```

## Good

```rust
use std::cell::{Cell, RefCell};

thread_local! {
    static BUFFER: RefCell<Vec<u8>> = RefCell::new(Vec::with_capacity(4096));
    static CALL_COUNT: Cell<u32> = Cell::new(0); // Cell is simpler for Copy types
}

fn append_to_buffer(data: &[u8]) {
    BUFFER.with_borrow_mut(|buf| buf.extend_from_slice(data));
}

fn flush_buffer() -> Vec<u8> {
    BUFFER.with_borrow_mut(|buf| std::mem::take(buf))
}

fn record_call() {
    CALL_COUNT.with(|c| c.set(c.get() + 1));
}

fn get_call_count() -> u32 {
    CALL_COUNT.with(|c| c.get())
}
```

## See Also

- [rust-own-refcell-interior](own-refcell-interior.md) - Interior mutability for single-threaded code
- [rust-own-mutex-interior](own-mutex-interior.md) - shared mutable state across threads requires `Mutex`
