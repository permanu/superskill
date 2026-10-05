---
id: rust-macro-private-helpers
lang: rust
prefix: macro
title: "Hide macro-generated helper items behind a `#[doc(hidden)] pub mod __private`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["private", "helpers", "hide", "macro-generated", "helper", "items", "behind", "doc"]
  files: ["**/*.rs"]
  symbols: ["doc"]
related: ["rust-macro-rules-hygiene", "rust-macro-proc-two-crate", "rust-doc-all-public"]
sources:
  - title: "rust-skills: macro-private-helpers"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/macro-private-helpers.md
---
> Hide macro-generated helper items behind a `#[doc(hidden)] pub mod __private`

## Why

Exported macros need to call helper functions, use types, or invoke traits at the call site. Placing those helpers directly in the crate's public API pollutes the surface with implementation details and freezes them under semver — any rename or removal becomes a breaking change. Routing all generated references through a `#[doc(hidden)] pub mod __private` keeps the public API clean while letting you evolve internals freely.

This is the pattern used by `serde`, `thiserror`, and many derive crates.

## Bad

```rust
// lib.rs — helper leaks into the public API
pub fn __format_value(v: &dyn std::fmt::Debug) -> String {
    format!("{v:?}")
}

#[macro_export]
macro_rules! debug_print {
    ($val:expr) => {
        println!("{}", $crate::__format_value(&$val));
    };
}

// // A user sees `__format_value` in the docs and may depend on it.
// // Removing it later is a semver-breaking change.
```

## Good

```rust
// lib.rs

#[doc(hidden)]
pub mod __private {
    // Everything re-exported here is technically public (required for
    // macro call sites), but hidden from rendered docs and clearly
    // marked as an unstable implementation detail.
    pub use crate::helpers::format_value;
}

// Internal module — not public.
mod helpers {
    pub fn format_value(v: &dyn std::fmt::Debug) -> String {
        format!("{v:?}")
    }
}

#[macro_export]
macro_rules! debug_print {
    ($val:expr) => {
        // Reference through __private; never through the bare crate root.
        println!("{}", $crate::__private::format_value(&$val));
    };
}
```

## See Also

- [rust-macro-rules-hygiene](macro-rules-hygiene.md) - `$crate` for correct path resolution
- [rust-macro-proc-two-crate](macro-proc-two-crate.md) - Separating proc-macro and facade crates
- [rust-doc-all-public](doc-all-public.md) - Documenting public items
