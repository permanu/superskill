---
id: rust-unsafe-no-mangle-unsafe
lang: rust
prefix: unsafe
title: "In Rust 2024, write `#[unsafe(no_mangle)]`, `#[unsafe(export_name = \"...\")]`, and `#[unsafe(link_section = \"...\")]` — not the bare attribute forms."
severity: must
enforce: review
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["mangle", "unsafe", "rust", "2024", "write", "no_mangle", "export_name", "link_section"]
  files: ["**/*.rs"]
related: ["rust-unsafe-extern-block", "rust-type-repr-transparent"]
sources:
  - title: "rust-skills: unsafe-no-mangle-unsafe"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/unsafe-no-mangle-unsafe.md
---
> In Rust 2024, write `#[unsafe(no_mangle)]`, `#[unsafe(export_name = "...")]`, and `#[unsafe(link_section = "...")]` — not the bare attribute forms.

## Why

> Note: the Bad snippet intentionally does not compile on Rust 2024 (bare `#[no_mangle]`, `#[export_name]`, and `#[link_section]` are rejected as unsafe attributes; it is valid Rust 2021 code shown for contrast).

`#[no_mangle]`, `#[export_name]`, and `#[link_section]` were reclassified as unsafe in Rust 2024 because they can cause undefined behavior without any `unsafe` block at the call site. If two items in the same binary share the same exported symbol name, the linker silently picks one and discards the other — the "winning" symbol may have a completely different type, signature, or semantics. The result is type-level UB with no diagnostic from the compiler or linker. Requiring `#[unsafe(...)]` makes this footgun visible and auditable.

## Bad

```rust
// Rust 2021 — bare attributes accepted, no warning about linker UB
#[no_mangle]
pub extern "C" fn init() {}

#[export_name = "plugin_entry"]
pub fn plugin_main() {}

#[link_section = ".init_array"]
static INIT: extern "C" fn() = init;
```

## Good

```rust
// Rust 2024 — wrapping the attribute makes the risk explicit
#[unsafe(no_mangle)]
pub extern "C" fn init() {}

#[unsafe(export_name = "plugin_entry")]
pub fn plugin_main() {}

#[unsafe(link_section = ".init_array")]
static INIT: extern "C" fn() = init;
```

## See Also

- [rust-unsafe-extern-block](unsafe-extern-block.md) - wrap `extern` blocks in `unsafe extern` in Rust 2024
- [rust-type-repr-transparent](type-repr-transparent.md) - use `#[repr(transparent)]` for FFI newtypes
