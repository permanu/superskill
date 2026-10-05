---
id: rust-unsafe-send-sync-manual
lang: rust
prefix: unsafe
title: "Document the invariants when manually implementing `Send` or `Sync`; prefer letting the compiler derive them automatically."
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["send", "sync", "manual", "document", "invariants", "manually", "implementing", "letting"]
  files: ["**/*.rs"]
  symbols: ["Send", "Sync"]
related: ["rust-unsafe-safety-comment", "rust-type-phantom-marker", "rust-own-arc-shared"]
sources:
  - title: "rust-skills: unsafe-send-sync-manual"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/unsafe-send-sync-manual.md
---
> Document the invariants when manually implementing `Send` or `Sync`; prefer letting the compiler derive them automatically.

## Why

`Send` and `Sync` are `unsafe` auto-traits. The compiler derives them automatically and correctly for most types — manual implementations signal that the borrow checker cannot verify the invariant on its own. Get it wrong and you introduce data races that are impossible to catch with safe code. A manual `unsafe impl Send` without a clear justification is a liability: the next person to modify the type's fields may silently break the invariant without realizing the impl is load-bearing.

## Bad

```rust
use std::cell::Cell;
use std::sync::Arc;

// Cell<T> is !Sync because it allows non-atomic interior mutation.
// This manual impl removes that protection with no explanation.
struct SharedCounter {
    value: Cell<u32>,
}

unsafe impl Sync for SharedCounter {} // data race waiting to happen — no SAFETY comment
unsafe impl Send for SharedCounter {} // likewise

// Wrapping a raw pointer but forgetting to opt out of auto-Send/Sync.
struct MyBuffer {
    ptr: *mut u8,
    len: usize,
}
// *mut u8 is already !Send + !Sync, so the compiler correctly withholds
// auto-impls — but if you blindly add unsafe impls without justification,
// you may send the pointer to another thread while something else mutates it.
unsafe impl Send for MyBuffer {}  // no SAFETY: comment — why is this sound?
```

## Good

```rust
use std::marker::PhantomData;
use std::sync::{Arc, Mutex};

// 1. Opt OUT of auto Send/Sync with PhantomData (raw pointers)
struct RawRef<T> {
    ptr: *const T,
    _marker: PhantomData<*const T>,
}

// 2. Opt IN with documented unsafe impls
struct OwnedBuffer { ptr: *mut u8 }

// SAFETY: OwnedBuffer owns its allocation exclusively (no aliasing),
// and the pointer is valid for the whole lifetime of the struct.
unsafe impl Send for OwnedBuffer {}

// SAFETY: all mutation requires &mut self, so shared refs never mutate.
unsafe impl Sync for OwnedBuffer {}

// 3. Prefer types the compiler can auto-derive Send/Sync for
struct SafeCounter { value: Mutex<u32> }

fn make_shared() -> Arc<SafeCounter> {
    Arc::new(SafeCounter { value: Mutex::new(0) })
}
```

## See Also

- [rust-unsafe-safety-comment](unsafe-safety-comment.md) - write `// SAFETY:` above every unsafe impl
- [rust-type-phantom-marker](type-phantom-marker.md) - use `PhantomData<T>` for type-level markers
- [rust-own-arc-shared](own-arc-shared.md) - use `Arc<T>` for thread-safe shared ownership
