---
id: rust-macro-proc-error-spans
lang: rust
prefix: macro
title: "Report proc-macro errors as spanned compile errors, never by panicking"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["proc", "error", "spans", "report", "proc-macro", "errors", "spanned", "compile"]
  files: ["**/*.rs"]
related: ["rust-macro-proc-syn-quote", "rust-err-thiserror-lib"]
sources:
  - title: "rust-skills: macro-proc-error-spans"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/macro-proc-error-spans.md
---
> Report proc-macro errors as spanned compile errors, never by panicking

## Why

A `panic!`, `.unwrap()`, or `.expect()` inside a proc-macro produces an opaque compiler message — "proc macro panicked" — with no source location. The user sees no indication of which part of their code triggered the error. Returning a `syn::Error` converted to a token stream instead gives a diagnostic that points directly at the offending span, exactly like an ordinary compiler error.

## Bad

```rust
use proc_macro::TokenStream;
use syn::{parse_macro_input, Data, DeriveInput};

#[proc_macro_derive(MyTrait)]
pub fn derive_my_trait(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let fields = match input.data {
        Data::Struct(ref s) => &s.fields,
        _ => panic!("MyTrait can only be derived on structs"),
    };
    let first = fields.iter().next().unwrap();
    let name = first.ident.as_ref().unwrap();
    quote::quote! {
        impl MyTrait for #name {}
    }
    .into()
}

// Downstream error message when the macro panics:
// error: proc macro panicked
//   --> src/main.rs:3:10
//    |
//  3 | #[derive(MyTrait)]
//    |          ^^^^^^^
```

## Good

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{Data, DeriveInput, Error};

#[proc_macro_derive(MyTrait)]
pub fn derive_my_trait(input: TokenStream) -> TokenStream {
    derive_inner(input).unwrap_or_else(|e| e.to_compile_error().into())
}

fn derive_inner(input: TokenStream) -> Result<TokenStream, Error> {
    let input = syn::parse::<DeriveInput>(input)?;
    let Data::Struct(s) = &input.data else {
        return Err(Error::new_spanned(&input.ident, "MyTrait requires a struct"));
    };
    let first = s.fields.iter().next().ok_or_else(|| Error::new_spanned(&input.ident, "requires a field"))?;
    // Attach the error to the field's span, not the struct name
    let name = first.ident.as_ref().ok_or_else(|| Error::new_spanned(first, "requires a named field"))?;
    let ident = &input.ident;
    Ok(quote! {
        impl MyTrait for #ident {
            fn first_field_name() -> &'static str { stringify!(#name) }
        }
    }
    .into())
}
```

## See Also

- [rust-macro-proc-syn-quote](macro-proc-syn-quote.md) - Parsing with syn, quoting with quote
- [rust-err-thiserror-lib](err-thiserror-lib.md) - Idiomatic library error types
