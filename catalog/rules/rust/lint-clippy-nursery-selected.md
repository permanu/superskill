---
id: rust-lint-clippy-nursery-selected
lang: rust
prefix: lint
title: "Enable high-value `clippy::nursery` lints selectively, not the whole group"
severity: prefer
enforce: tool
tool: clippy::nursery
baseline: latest
status: verified
triggers:
  keywords: ["clippy", "nursery", "selected", "enable", "high-value", "lints", "selectively", "whole"]
  files: ["**/*.rs"]
  symbols: ["clippy::nursery"]
related: ["rust-lint-pedantic-selective", "rust-lint-warn-perf", "rust-anti-lock-across-await"]
sources:
  - title: "rust-skills: lint-clippy-nursery-selected"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/lint-clippy-nursery-selected.md
---
> Enable high-value `clippy::nursery` lints selectively, not the whole group

## Why

The `clippy::nursery` group contains lints that are correct and useful but still being refined — their suggestions may be noisy or have edge cases that haven't been polished yet. Enabling the entire group (`#![warn(clippy::nursery)]`) floods you with false positives and creates churn as nursery lints graduate or change. Cherry-picking individual lints gives you the signal without the noise. Several nursery lints are especially valuable: `significant_drop_tightening` catches lock guards held across `.await` or longer than necessary, `redundant_clone` flags clones that could be moves, and `use_self` keeps type names DRY inside impl blocks.

## Bad

```rust
// # Cargo.toml — enables every nursery lint, including noisy ones
// [lints.clippy]
// nursery = "warn"
```

## Good

```rust
// # Cargo.toml — selectively enable high-value nursery lints
// [lints.clippy]
// significant_drop_tightening = "warn"   # lock guards held too long
// redundant_clone = "warn"               # .clone() that could be a move
// use_self = "warn"                      # TypeName -> Self inside impls

use std::sync::Mutex;

struct MyStruct { value: i32 }

// significant_drop_tightening: drop the guard before other work
fn process(state: &Mutex<Vec<u32>>) -> usize {
    let guard = state.lock().unwrap();
    let len = guard.len();
    drop(guard);
    len
}

// use_self: write -> Self, not -> MyStruct
impl MyStruct {
    fn new() -> MyStruct { MyStruct { value: 0 } }
}
```

## See Also

- [rust-lint-pedantic-selective](lint-pedantic-selective.md) - Same strategy for clippy::pedantic
- [rust-lint-warn-perf](lint-warn-perf.md) - Enable the performance lint group
- [rust-anti-lock-across-await](anti-lock-across-await.md) - Don't hold locks across `.await`
