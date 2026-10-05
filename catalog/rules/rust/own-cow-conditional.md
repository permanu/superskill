---
id: rust-own-cow-conditional
lang: rust
prefix: own
title: "Use `Cow<'a, T>` for conditional ownership"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["cow", "conditional", "ownership"]
  files: ["**/*.rs"]
  symbols: ["Cow"]
related: ["rust-own-borrow-over-clone", "rust-mem-avoid-format"]
sources:
  - title: "rust-skills: own-cow-conditional"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/own-cow-conditional.md
  - title: "github.com/BurntSushi/ripgrep/blob/master/crates/globset/src/pathutil.rs"
    url: https://github.com/BurntSushi/ripgrep/blob/master/crates/globset/src/pathutil.rs
---
> Use `Cow<'a, T>` for conditional ownership

## Why

`Cow` (Clone-on-Write) avoids allocations when ownership is conditional: it holds either a borrowed reference or an owned value, cloning only when mutation is needed.

## Bad

```rust
// Always allocates, even when input doesn't need modification
fn normalize_path(path: &str) -> String {
    if path.contains("//") {
        path.replace("//", "/")  // Allocation needed
    } else {
        path.to_string()  // Unnecessary allocation!
    }
}

// Always clones the error message
fn format_error(code: u32) -> String {
    match code {
        404 => "Not Found".to_string(),      // Unnecessary!
        500 => "Internal Error".to_string(), // Unnecessary!
        _ => format!("Error {}", code),      // This one needs allocation
    }
}
```

## Good

```rust
use std::borrow::Cow;

// Only allocates when needed
fn normalize_path(path: &str) -> Cow<'_, str> {
    if path.contains("//") {
        Cow::Owned(path.replace("//", "/"))  // Allocate
    } else {
        Cow::Borrowed(path)  // Zero-cost borrow
    }
}

// Static strings stay borrowed
fn format_error(code: u32) -> Cow<'static, str> {
    match code {
        404 => Cow::Borrowed("Not Found"),      // No allocation
        500 => Cow::Borrowed("Internal Error"), // No allocation
        _ => Cow::Owned(format!("Error {}", code)), // Allocate only for unknown
    }
}
```

## See Also

- [rust-own-borrow-over-clone](own-borrow-over-clone.md) - Prefer borrowing over cloning
- [rust-mem-avoid-format](mem-avoid-format.md) - Avoid format! when possible
