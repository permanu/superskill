---
id: rust-macro-proc-two-crate
lang: rust
prefix: macro
title: "Put procedural macros in a dedicated `proc-macro = true` crate and re-export from the facade"
severity: should
enforce: review
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["proc", "crate", "put", "procedural", "macros", "dedicated", "proc-macro", "true"]
  files: ["**/*.rs"]
related: ["rust-macro-proc-syn-quote", "rust-macro-private-helpers", "rust-proj-workspace-deps", "rust-err-thiserror-lib"]
sources:
  - title: "rust-skills: macro-proc-two-crate"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/macro-proc-two-crate.md
---
> Put procedural macros in a dedicated `proc-macro = true` crate and re-export from the facade

## Why

> Note: the Bad snippet intentionally does not compile (demonstrates that a `proc-macro = true` crate cannot export ordinary items — the trait and struct are rejected).

A crate marked `proc-macro = true` in `Cargo.toml` compiles for the host (the build machine) and can **only** export procedural macros — no regular types, traits, or functions. If your library needs both a derive/attribute macro and ordinary APIs, you must split into two crates: a `mycrate-derive` (or `mycrate-macros`) proc-macro crate and a `mycrate` facade crate that re-exports everything.

The facade approach ensures:
- Users add only `mycrate` as a dependency.
- Generated code refers to types through `::mycrate::__private::...`, so the impl crate version is invisible.
- Workspace dependency inheritance keeps both crates locked to the same version without repetition.

## Bad

```rust
use proc_macro::TokenStream;

// A single crate with `proc-macro = true` in Cargo.toml that also tries
// to export regular items:
#[proc_macro_derive(Greet)]
pub fn derive_greet(input: TokenStream) -> TokenStream {
    let _ = input;
    TokenStream::new()
}

pub trait Greet { fn greet(&self) -> String; } // error: a proc-macro crate
pub struct Config;                              // can only export proc-macros
```

## Good

```rust
// Split into a `proc-macro = true` crate plus a facade that re-exports it (full manifests and code below):

// users depend only on `mycrate`:
use mycrate::Greet;        // the trait
#[derive(mycrate::Greet)]  // the derive, re-exported from mycrate-derive
struct Robot;
```

## See Also

- [rust-macro-proc-syn-quote](macro-proc-syn-quote.md) - Building proc-macros with syn and quote
- [rust-macro-private-helpers](macro-private-helpers.md) - Hiding helpers behind `__private`
- [rust-proj-workspace-deps](proj-workspace-deps.md) - Workspace dependency inheritance
- [rust-err-thiserror-lib](err-thiserror-lib.md) - Thiserror as a real-world two-crate example
