---
id: rust-unsafe-minimize-scope
lang: rust
prefix: unsafe
title: "Keep `unsafe` blocks as small as possible — mark only the operation that requires unsafety, not the surrounding safe code."
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["minimize", "scope", "keep", "unsafe", "blocks", "small", "possible", "mark"]
  files: ["**/*.rs"]
related: ["rust-unsafe-safety-comment", "rust-unsafe-send-sync-manual"]
sources:
  - title: "rust-skills: unsafe-minimize-scope"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/unsafe-minimize-scope.md
---
> Keep `unsafe` blocks as small as possible — mark only the operation that requires unsafety, not the surrounding safe code.

## Why

When an entire function is marked `unsafe fn`, every line inside appears equally suspect to an auditor. Shrinking unsafe blocks to the minimum isolates exactly which operation violates Rust's safety invariants, making reviews tractable and bugs easier to find. The Rust 2024 edition enforces this with the `unsafe_op_in_unsafe_fn` lint: unsafe operations inside an `unsafe fn` now require their own explicit `unsafe {}` block rather than inheriting the function's unsafety implicitly.

## Bad

```rust
// Entire function body marked unsafe — safe arithmetic, bounds checks,
// and the single unsafe dereference are all equally "dangerous" to a reader.
unsafe fn sum_at(ptr: *const i32, len: usize, index: usize) -> i32 {
    let adjusted_len = len.saturating_sub(1); // safe — but looks unsafe
    assert!(index <= adjusted_len);           // safe — but looks unsafe
    let value = *ptr.add(index);              // the only actually unsafe op
    value + 1                                 // safe — but looks unsafe
}

// Huge unsafe block wrapping safe logic inside an unsafe fn (2024 edition
// now requires unsafe {} here anyway, but large blocks are still bad style).
pub unsafe fn process(ptr: *const u8, len: usize) -> Vec<u8> {
    unsafe {
        let mut result = Vec::with_capacity(len); // safe
        for i in 0..len {                         // safe
            result.push(*ptr.add(i));             // unsafe — buried in noise
        }
        result
    }
}
```

## Good

```rust
// Safe wrapper: the single unsafe operation is clearly isolated.
fn sum_at(ptr: *const i32, len: usize, index: usize) -> i32 {
    assert!(index < len, "index out of bounds");
    // SAFETY: index < len guarantees ptr.add(index) is within the allocation.
    let value = unsafe { *ptr.add(index) };
    value + 1
}

// In a genuinely unsafe fn, 2024 edition still requires unsafe {} per op.
/// # Safety
///
/// `ptr` must be valid for reads for `len` bytes and properly aligned.
pub unsafe fn process(ptr: *const u8, len: usize) -> Vec<u8> {
    let mut result = Vec::with_capacity(len); // safe — outside any unsafe block
    for i in 0..len {
        // SAFETY: caller guarantees ptr is valid for len bytes; i < len.
        let byte = unsafe { *ptr.add(i) };
        result.push(byte);
    }
    result
}
```

## See Also

- [rust-unsafe-safety-comment](unsafe-safety-comment.md) - write `// SAFETY:` above every unsafe block
- [rust-unsafe-send-sync-manual](unsafe-send-sync-manual.md) - document invariants when manually implementing Send/Sync
