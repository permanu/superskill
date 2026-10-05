---
id: rust-lint-warn-style
lang: rust
prefix: lint
title: "Enable clippy::style for idiomatic code"
severity: should
enforce: tool
tool: clippy::style
baseline: latest
status: verified
triggers:
  keywords: ["warn", "style", "enable", "clippy", "idiomatic", "code"]
  files: ["**/*.rs"]
related: ["rust-lint-warn-suspicious", "rust-lint-warn-complexity", "rust-lint-rustfmt-check"]
sources:
  - title: "rust-skills: lint-warn-style"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/lint-warn-style.md
---
> Enable clippy::style for idiomatic code

## Why

The `clippy::style` lint group enforces idiomatic Rust patterns. While not bugs, style violations make code harder to read and maintain. Consistent style helps teams work together and makes code easier to review.

## Bad

```rust
fn do_something(_x: i32) {}

fn style_examples() {
    // WARN: redundant clone on a Copy type
    let x = 5;
    let y = x.clone();  // Just use: let y = x;
    let _ = y;

    // WARN: redundant closure
    let iter = [1, 2, 3].into_iter();
    let _ = iter.map(|x| x + 1);

    // WARN: should use if let
    let option = Some(1);
    match option {
        Some(x) => do_something(x),
        None => {}
    }

    // WARN: `is_`-prefixed fn returning non-bool
    fn is_valid() -> i32 { 0 }  // Misleading name
    let _ = is_valid();
}
```

## Good

```rust
// In lib.rs or main.rs
#![warn(clippy::style)]

// Or in `Cargo.toml`:

// [lints.clippy]
// style = "warn"
```

## See Also

- [rust-lint-warn-suspicious](lint-warn-suspicious.md) - Suspicious patterns
- [rust-lint-warn-complexity](lint-warn-complexity.md) - Complexity warnings
- [rust-lint-rustfmt-check](lint-rustfmt-check.md) - Formatting checks
