---
id: rust-lint-warn-perf
lang: rust
prefix: lint
title: "Enable clippy::perf for performance improvements"
severity: should
enforce: tool
tool: clippy::perf
baseline: latest
status: verified
triggers:
  keywords: ["warn", "perf", "enable", "clippy", "performance", "improvements"]
  files: ["**/*.rs"]
related: ["rust-lint-warn-complexity", "rust-mem-with-capacity", "rust-perf-profile-first"]
sources:
  - title: "rust-skills: lint-warn-perf"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/lint-warn-perf.md
---
> Enable clippy::perf for performance improvements

## Why

The `clippy::perf` lint group catches performance anti-patterns—inefficient allocations, unnecessary copies, suboptimal API usage. While not all performance issues are critical, avoiding obvious inefficiencies is good practice.

## Bad

```rust
fn take_string(_s: impl Into<String>) {}

fn perf_examples() {
    // WARN: unnecessary to_string before into
    take_string("hello".to_string());
    // WARN: unnecessary vec! for iteration
    for x in vec![1, 2, 3] { let _ = x; }
    // WARN: single-character string patterns
    let s = "hello";
    s.starts_with("x");
    s.contains("a");
    // WARN: iter().nth(0) instead of next()
    let mut iter = [1, 2, 3].into_iter();
    iter.nth(0);
    // WARN: manual saturating arithmetic
    let (x, y): (i32, i32) = (1, 2);
    let _ = if x > i32::MAX - y { i32::MAX } else { x + y };
    // WARN: extend with a single element
    let mut v = Vec::new();
    v.extend(std::iter::once(1));
    // WARN: manual string concatenation
    let _ = format!("{}{}", "a", "b");
}
```

## Good

```rust
// In lib.rs or main.rs
#![warn(clippy::perf)]

// Or in `Cargo.toml`:

// [lints.clippy]
// perf = "warn"
```

## See Also

- [rust-lint-warn-complexity](lint-warn-complexity.md) - Complexity warnings
- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocation
- [rust-perf-profile-first](perf-profile-first.md) - Profile before optimizing
