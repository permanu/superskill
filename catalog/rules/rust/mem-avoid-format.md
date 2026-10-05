---
id: rust-mem-avoid-format
lang: rust
prefix: mem
title: "Avoid `format!()` when string literals work"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["format", "string", "literals", "work"]
  files: ["**/*.rs"]
  symbols: ["format"]
related: ["rust-mem-write-over-format", "rust-mem-with-capacity", "rust-own-cow-conditional"]
sources:
  - title: "rust-skills: mem-avoid-format"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-avoid-format.md
---
> Avoid `format!()` when string literals work

## Why

`format!()` always allocates a new String, even for constant text. In hot paths, these allocations add up. Use string literals, `write!()`, or pre-allocated buffers instead.

## Bad

```rust
// Allocates every time, even for static text
fn get_error_message() -> String {
    format!("An error occurred")  // Unnecessary allocation!
}

// Allocates in a loop
fn log_items(items: &[&str]) {
    for item in items {
        log::info!("{}", format!("Processing item: {}", item));  // Double work!
    }
}

// format! in hot path
fn classify(n: i32) -> String {
    if n > 0 {
        format!("positive")  // Allocates!
    } else if n < 0 {
        format!("negative")  // Allocates!
    } else {
        format!("zero")      // Allocates!
    }
}
```

## Good

```rust
use std::borrow::Cow;

// Return &'static str for constants
fn get_error_message() -> &'static str {
    "An error occurred"  // No allocation
}

// Use format args directly
fn log_items(items: &[&str]) {
    for item in items {
        log::info!("Processing item: {}", item);  // No intermediate String
    }
}

// Return Cow for mixed static/dynamic
fn classify(n: i32) -> Cow<'static, str> {
    if n > 0 { Cow::Borrowed("positive") }
    else if n < 0 { Cow::Borrowed("negative") }
    else { Cow::Borrowed("zero") }
}

// Or &'static str when always static
fn classify_str(n: i32) -> &'static str {
    if n > 0 { "positive" } else if n < 0 { "negative" } else { "zero" }
}
```

## See Also

- [rust-mem-write-over-format](mem-write-over-format.md) - Use write!() instead of format!()
- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocate strings
- [rust-own-cow-conditional](own-cow-conditional.md) - Use Cow for mixed static/dynamic
