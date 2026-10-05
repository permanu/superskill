---
id: rust-macro-proc-syn-quote
lang: rust
prefix: macro
title: "Build procedural macros with `syn`, `quote`, and `proc-macro2`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["proc", "syn", "quote", "build", "procedural", "macros", "proc-macro2"]
  files: ["**/*.rs"]
  symbols: ["syn", "quote"]
related: ["rust-macro-proc-two-crate", "rust-macro-proc-error-spans"]
sources:
  - title: "rust-skills: macro-proc-syn-quote"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/macro-proc-syn-quote.md
---
> Build procedural macros with `syn`, `quote`, and `proc-macro2`

## Why

Writing a proc-macro by hand-parsing `proc_macro::TokenStream` is fragile and verbose. The standard ecosystem trio — `syn` (parsing), `quote` (code generation), and `proc-macro2` (span-aware token types) — gives you a typed AST, readable quasi-quoting, and the ability to unit-test your macro logic outside the compiler.

Enable only the `syn` features you actually use. The `full` feature parses all Rust syntax but adds compile time; `derive` is sufficient for most `#[proc_macro_derive]` implementations.

## Bad

```rust
// Manually iterating tokens to find a struct name — brittle and hard to read.
use proc_macro::TokenStream;

#[proc_macro_derive(Hello)]
pub fn derive_hello(input: TokenStream) -> TokenStream {
    let mut iter = input.into_iter();
    // skip `struct` and grab the next ident: error-prone and breaks on generics
    iter.next(); // "struct"
    let name = iter.next().unwrap().to_string();
    format!("impl Hello for {name} {{ fn hello(&self) {{ println!(\"hello\"); }} }}")
        .parse()
        .unwrap()
}
```

## Good

```rust
// # Cargo.toml for the derive crate
// [dependencies]
// syn = { version = "2", features = ["derive"] }
// quote = "1"
// proc-macro2 = "1"

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(Hello)]
pub fn derive_hello(input: TokenStream) -> TokenStream {
    // parse_macro_input! yields a typed DeriveInput or a compile error
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;
    let (impl_generics, ty_generics, where_clause) = input.generics.split_for_impl();
    let expanded = quote! {
        impl #impl_generics Hello for #name #ty_generics #where_clause {
            fn hello(&self) {
                println!("hello from {}", stringify!(#name));
            }
        }
    };
    expanded.into()
}
```

## See Also

- [rust-macro-proc-two-crate](macro-proc-two-crate.md) - Separating proc-macro and facade crates
- [rust-macro-proc-error-spans](macro-proc-error-spans.md) - Reporting errors with spans, not panics
