---
id: rust-mem-smallvec
lang: rust
prefix: mem
title: "Use `SmallVec` for usually-small collections"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["smallvec", "usually-small", "collections"]
  files: ["**/*.rs"]
  symbols: ["SmallVec"]
related: ["rust-mem-arrayvec", "rust-mem-with-capacity", "rust-mem-thinvec"]
sources:
  - title: "rust-skills: mem-smallvec"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-smallvec.md
  - title: "github.com/rust-lang/rust/blob/main/compiler/rustc_expand/src/base.rs"
    url: https://github.com/rust-lang/rust/blob/main/compiler/rustc_expand/src/base.rs
---
> Use `SmallVec` for usually-small collections

## Why

`SmallVec<[T; N]>` stores up to N elements inline (on the stack), only allocating on the heap when the size exceeds N. This eliminates heap allocations for the common case while still allowing growth when needed.

## Bad

```rust
struct Input;

struct ValidationError;

// Always heap-allocates, even for 1-2 elements
fn get_path_components(path: &str) -> Vec<&str> {
    path.split('/').collect()  // Usually 2-4 components
}

// Always heap-allocates for error list
fn validate(input: &Input) -> Vec<ValidationError> {
    let mut errors = Vec::new();  // Usually 0-3 errors
    // push errors as validation discovers them
    errors
}
```

## Good

```rust
use smallvec::{smallvec, SmallVec};

struct Input;

struct ValidationError;

// Stack-allocated for typical paths (1-8 components)
fn get_path_components(path: &str) -> SmallVec<[&str; 8]> {
    path.split('/').collect()
}

// Stack-allocated for typical error counts
fn validate(input: &Input) -> SmallVec<[ValidationError; 4]> {
    let mut errors = SmallVec::new();
    // push errors as validation discovers them
    errors
}

fn main() {
    // Using smallvec! macro
    let v: SmallVec<[i32; 4]> = smallvec![1, 2, 3];
}
```

## See Also

- [rust-mem-arrayvec](mem-arrayvec.md) - Use ArrayVec for fixed-max collections
- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocate when size is known
- [rust-mem-thinvec](mem-thinvec.md) - Use ThinVec for vectors that are empty in the common case
