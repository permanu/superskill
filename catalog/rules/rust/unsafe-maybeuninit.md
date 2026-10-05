---
id: rust-unsafe-maybeuninit
lang: rust
prefix: unsafe
title: "Use `MaybeUninit<T>` for uninitialized memory; never use `mem::uninitialized()` or `mem::zeroed()` for types with validity invariants."
severity: must
enforce: review
compile_exempt: "toolchain lag: MaybeUninit::<[T; N]>::from stabilized after rustc 1.94 (verified on 1.95); the local harness compiles with 1.94"
baseline: latest
status: verified
triggers:
  keywords: ["maybeuninit", "uninitialized", "memory", "mem", "zeroed", "types", "validity", "invariants"]
  files: ["**/*.rs"]
  symbols: ["MaybeUninit", "mem::uninitialized", "mem::zeroed"]
related: ["rust-unsafe-safety-comment", "rust-mem-with-capacity"]
sources:
  - title: "rust-skills: unsafe-maybeuninit"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/unsafe-maybeuninit.md
---
> Use `MaybeUninit<T>` for uninitialized memory; never use `mem::uninitialized()` or `mem::zeroed()` for types with validity invariants.

## Why

`mem::uninitialized()` is deprecated and is immediate undefined behavior for any type whose bit patterns have validity invariants — `bool` (only `0` and `1` are valid), `&T` (must be non-null and aligned), `NonZeroU32`, `char`, and enum types. Even `mem::zeroed()` triggers UB for references and `NonZero*` types. `MaybeUninit<T>` is the correct abstraction: it wraps uninitialized memory without ever producing an invalid `T`, and the compiler cannot optimize around it incorrectly. The standard library uses `MaybeUninit` pervasively for its data structures.

## Bad

```rust
use std::mem;

fn main() {
    // Instant UB: `bool` has validity invariants; uninitialized bits are not
    // guaranteed to be 0 or 1. The optimizer may miscompile code that follows.
    let b: bool = unsafe { mem::uninitialized() };

    // Also UB for references — a zero reference is immediately invalid.
    let r: &u32 = unsafe { mem::zeroed() };

    // Uninitialized array the wrong way — triggers UB during construction.
    let mut buf: [u8; 1024] = unsafe { mem::uninitialized() };

    let _ = (b, r, &mut buf);
}
```

## Good

```rust
use std::mem::MaybeUninit;

fn main() {
    // Single value: write, then assume_init
    let mut x = MaybeUninit::<u32>::uninit();
    x.write(42);
    let _: u32 = unsafe { x.assume_init() }; // SAFETY: just written
}
// Array: initialize each element, then convert via From
fn init_array() -> [u8; 1024] {
    let mut buf: [MaybeUninit<u8>; 1024] = [const { MaybeUninit::uninit() }; 1024];
    for elem in &mut buf {
        elem.write(0u8);
    }
    unsafe { MaybeUninit::<[u8; 1024]>::from(buf).assume_init() } // SAFETY: all written
}

// Vec spare capacity: initialize, then set_len
fn fill_vec(v: &mut Vec<u8>, extra: usize) {
    v.reserve(extra);
    for slot in v.spare_capacity_mut().iter_mut().take(extra) {
        slot.write(0u8);
    }
    unsafe { v.set_len(v.len() + extra) }; // SAFETY: extra elements initialized
}
```

## See Also

- [rust-unsafe-safety-comment](unsafe-safety-comment.md) - Document every unsafe block including `assume_init` calls
- [rust-mem-with-capacity](mem-with-capacity.md) - Use `with_capacity` when size is known to avoid extra allocations
