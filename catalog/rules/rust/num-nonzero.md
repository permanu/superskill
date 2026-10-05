---
id: rust-num-nonzero
lang: rust
prefix: num
title: "Use `NonZero*` types to forbid zero and unlock the niche optimization"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["nonzero", "types", "forbid", "zero", "unlock", "niche", "optimization"]
  files: ["**/*.rs"]
related: ["rust-type-newtype-ids", "rust-mem-smaller-integers"]
sources:
  - title: "rust-skills: num-nonzero"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/num-nonzero.md
---
> Use `NonZero*` types to forbid zero and unlock the niche optimization

## Why

`NonZeroU32`, `NonZeroI64`, and their siblings (available for all integer primitives in `std::num`) make zero unrepresentable at the type level — you cannot construct one without going through `NonZeroU32::new(n)`, which returns `Option<NonZeroU32>`. This pushes the zero-check to the construction site and eliminates defensive zero-checks throughout the rest of the code. As a bonus, the compiler uses the zero bit-pattern as a *niche*, so `Option<NonZeroU32>` is exactly the same size as `u32` — no overhead for the `Option` tag.

## Bad

```rust
// caller must remember never to pass 0, but nothing enforces it
fn divide(numerator: u32, denominator: u32) -> u32 {
    assert!(denominator != 0, "denominator must not be zero");
    numerator / denominator
}

// ID of 0 is "invalid" by convention — not enforced
struct Widget {
    id: u32,  // 0 means "not yet assigned" — stringly-typed convention
}
```

## Good

```rust
use std::{mem::size_of, num::NonZeroU32};

// Zero is rejected at construction; division is always safe.
fn divide(numerator: u32, denominator: NonZeroU32) -> u32 {
    numerator / denominator.get()
}

// ID is guaranteed non-zero; Option<WidgetId> is niche-optimized.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct WidgetId(NonZeroU32);

impl WidgetId {
    pub fn new(id: u32) -> Option<Self> { NonZeroU32::new(id).map(WidgetId) }
    pub fn get(self) -> u32 { self.0.get() }
}

fn demo() {
    assert!(WidgetId::new(0).is_none());
    assert_eq!(WidgetId::new(42).unwrap().get(), 42);
    assert_eq!(divide(12, NonZeroU32::new(3).unwrap()), 4);
    // niche optimization: no space overhead for the Option tag
    assert_eq!(size_of::<Option<NonZeroU32>>(), size_of::<u32>());
}
```

## See Also

- [rust-type-newtype-ids](type-newtype-ids.md) - wrap IDs in newtypes for type-safe distinctions
- [rust-mem-smaller-integers](mem-smaller-integers.md) - Use the smallest integer type that fits
