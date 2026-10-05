---
id: rust-mem-take-replace
lang: rust
prefix: mem
title: "Use `mem::take` / `mem::replace` to move a value out of a `&mut` without cloning"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["take", "replace", "mem", "move", "value", "mut", "without", "cloning"]
  files: ["**/*.rs"]
  symbols: ["mem::take", "mem::replace"]
related: ["rust-own-move-large", "rust-mem-clone-from", "rust-own-borrow-over-clone"]
sources:
  - title: "rust-skills: mem-take-replace"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-take-replace.md
---
> Use `mem::take` / `mem::replace` to move a value out of a `&mut` without cloning

## Why

Rust's ownership rules prevent you from moving a field out of a `&mut self` reference — the compiler must guarantee the field is not left in an invalid state. The standard workaround many developers reach for is `.clone()`, but that allocates unnecessarily. `std::mem::take` swaps the field with `T::default()` and returns the original value; `std::mem::replace` swaps in an explicit value of your choosing. Both are zero-copy and work wherever you have `&mut T`.

## Bad

```rust
struct Processor {
    items: Vec<String>,
}

impl Processor {
    // clones the entire Vec just to drain it — unnecessary allocation
    fn flush(&mut self) -> Vec<String> {
        let v = self.items.clone();
        self.items.clear();
        v
    }
}
```

## Good

```rust
use std::mem;

struct Processor {
    items: Vec<String>,
}

impl Processor {
    // moves the Vec out in one step, leaving an empty Vec behind
    fn flush(&mut self) -> Vec<String> {
        mem::take(&mut self.items)
    }
}

// `mem::take` is equivalent to `mem::replace(&mut self.items, Vec::new())` but shorter when the replacement value is `Default::default()`.
```

## See Also

- [rust-own-move-large](own-move-large.md) - Move large data instead of cloning
- [rust-mem-clone-from](mem-clone-from.md) - Use `clone_from()` to reuse allocations
- [rust-own-borrow-over-clone](own-borrow-over-clone.md) - prefer `&T` borrowing over `.clone()`
