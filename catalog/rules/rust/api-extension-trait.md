---
id: rust-api-extension-trait
lang: rust
prefix: api
title: "Use extension traits to add methods to external types"
severity: should
enforce: review
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["extension", "trait", "traits", "add", "methods", "external", "types"]
  files: ["**/*.rs"]
related: ["rust-api-sealed-trait", "rust-api-impl-into", "rust-name-as-free", "rust-trait-blanket-impl"]
sources:
  - title: "rust-skills: api-extension-trait"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-extension-trait.md
---
> Use extension traits to add methods to external types

## Why

> Note: the Bad snippet intentionally does not compile (demonstrates E0116: cannot define an inherent impl for a type outside this crate, and the orphan-rule violation for the external trait).

Rust's orphan rules prevent implementing external traits on external types. Extension traits provide a workaround: define a new trait with your methods, then implement it for the external type. This pattern is used extensively in the ecosystem (e.g., `itertools::Itertools`, `tokio::AsyncReadExt`).

## Bad

```rust
// Can't add methods directly to external types
impl Vec<u8> {
    fn as_hex(&self) -> String {
        // Error: cannot define inherent impl for a type outside this crate
    }
}

// Can't implement external trait for external type
impl SomeExternalTrait for Vec<u8> {
    // Error: orphan rules violation
}
```

## Good

```rust
mod ext {
    // Define an extension trait
    pub trait ByteSliceExt {
        fn as_hex(&self) -> String;
        fn is_ascii_printable(&self) -> bool;
    }
    // Implement for the external type
    impl ByteSliceExt for [u8] {
        fn as_hex(&self) -> String {
            self.iter().map(|b| format!("{:02x}", b)).collect()
        }
        fn is_ascii_printable(&self) -> bool {
            self.iter().all(|b| b.is_ascii_graphic() || b.is_ascii_whitespace())
        }
    }
}

// Usage: import the trait to use the methods
use ext::ByteSliceExt;

fn main() {
    let data: &[u8] = b"hello";
    println!("{}", data.as_hex());  // "68656c6c6f"
}
```

## See Also

- [rust-api-sealed-trait](api-sealed-trait.md) - Controlling trait implementations
- [rust-api-impl-into](api-impl-into.md) - Using standard conversion traits
- [rust-name-as-free](name-as-free.md) - Naming conventions for conversions
- [rust-trait-blanket-impl](trait-blanket-impl.md) - Blanket impls for extension traits
