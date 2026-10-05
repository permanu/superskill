---
id: rust-macro-rules-hygiene
lang: rust
prefix: macro
title: "Rely on `macro_rules!` hygiene and use `$crate` for paths to your crate's items"
severity: should
enforce: review
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["rules", "hygiene", "rely", "macro_rules", "crate", "paths", "items"]
  files: ["**/*.rs"]
  symbols: ["macro_rules"]
related: ["rust-macro-export-crate-path", "rust-macro-private-helpers", "rust-macro-prefer-functions"]
sources:
  - title: "rust-skills: macro-rules-hygiene"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/macro-rules-hygiene.md
---
> Rely on `macro_rules!` hygiene and use `$crate` for paths to your crate's items

## Why

> Note: the Bad snippet intentionally does not compile (demonstrates that `crate::` inside an exported macro resolves against the caller's crate, so a consumer fails with `cannot find function log_value in the crate root`).

`macro_rules!` is hygienic for local bindings: identifiers introduced inside the macro (with `let`, loop labels, etc.) live in their own namespace and cannot shadow or clash with the caller's identifiers. This protects callers from surprising capture bugs.

Item paths, however, are not automatically resolved. If your macro calls `crate::helper()`, it silently breaks when the macro is used from a different crate. Use `$crate::helper()` instead — `$crate` expands to the defining crate regardless of call site, so the macro works correctly even when re-exported.

## Bad

```rust
// lib.rs
pub fn log_value(v: &str) {
    println!("[log] {v}");
}

#[macro_export]
macro_rules! log {
    ($val:expr) => {
        // WRONG: `crate::` resolves relative to the *caller's* crate,
        // not to the crate that defined this macro.
        crate::log_value(&format!("{:?}", $val));
    };
}

// consumer/src/main.rs
use mylib::log;

fn main() {
    log!(42); // compile error: `crate::log_value` not found in consumer
}
```

## Good

```rust
// lib.rs
pub fn log_value(v: &str) {
    println!("[log] {v}");
}

#[macro_export]
macro_rules! log {
    ($val:expr) => {
        // `$crate` always expands to the crate that defined this macro.
        $crate::log_value(&format!("{:?}", $val));
    };
}

// consumer/src/main.rs — `use mylib::log;` imports the exported macro by path.
fn main() {
    log!(42); // correctly calls mylib::log_value
}
```

## See Also

- [rust-macro-export-crate-path](macro-export-crate-path.md) - Exporting macros with clean import paths
- [rust-macro-private-helpers](macro-private-helpers.md) - Hiding helper items used by macros
- [rust-macro-prefer-functions](macro-prefer-functions.md) - When to avoid macros entirely
