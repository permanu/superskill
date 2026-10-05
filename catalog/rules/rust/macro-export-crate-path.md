---
id: rust-macro-export-crate-path
lang: rust
prefix: macro
title: "Export declarative macros with `#[macro_export]` and a clean import path"
severity: should
enforce: review
baseline: latest
status: verified
compile_exempt: "Bad demonstrates legacy `#[macro_use] extern crate mylib` and needs a separate consumer crate"
triggers:
  keywords: ["export", "crate", "path", "declarative", "macros", "macro_export", "clean", "import"]
  files: ["**/*.rs"]
  symbols: ["macro_export"]
related: ["rust-macro-rules-hygiene", "rust-macro-private-helpers", "rust-proj-workspace-deps"]
sources:
  - title: "rust-skills: macro-export-crate-path"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/macro-export-crate-path.md
---
> Export declarative macros with `#[macro_export]` and a clean import path

## Why

`#[macro_export]` lifts a macro to the crate root, making it importable like any other item. Combined with `$crate::` paths (see `macro-rules-hygiene`), the macro works regardless of how callers import it. Since Rust 2018, callers can use ordinary path imports (`use mycrate::my_macro;`) rather than the legacy `#[macro_use] extern crate mycrate;`, which polluted the global namespace and depended on item ordering.

## Bad

```rust
// lib.rs — legacy style
// Requires callers to write `#[macro_use] extern crate mylib;`
// and dumps all macros into the caller's global scope.
macro_rules! greet {
    ($name:expr) => {
        println!("hello, {}", $name);
    };
}

// consumer/src/main.rs — legacy
#[macro_use]
extern crate mylib; // order-sensitive; pollutes namespace

fn main() {
    greet!("world");
}
```

## Good

```rust
// lib.rs — modern style
#[macro_export]
macro_rules! greet {
    ($name:expr) => {
        $crate::__private::print_greeting($name);
    };
}

#[doc(hidden)]
pub mod __private {
    pub fn print_greeting(name: &str) {
        println!("hello, {name}");
    }
}

// Re-export so `use mylib::greet;` resolves through the crate's public path.
// (The re-export is implicit when using #[macro_export]; this is just for clarity
// or when you want to place it under a module path.)

// consumer/src/main.rs — modern: `use mylib::greet;`
fn main() {
    greet!("world");
}
```

## See Also

- [rust-macro-rules-hygiene](macro-rules-hygiene.md) - Using `$crate` for correct item resolution
- [rust-macro-private-helpers](macro-private-helpers.md) - Hiding helpers used by exported macros
- [rust-proj-workspace-deps](proj-workspace-deps.md) - Workspace dependency inheritance
