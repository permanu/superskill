---
id: rust-unsafe-extern-block
lang: rust
prefix: unsafe
title: "In Rust 2024, wrap `extern` blocks in `unsafe extern { }` and annotate each item as `safe` or `unsafe`."
severity: must
enforce: review
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["extern", "block", "rust", "2024", "wrap", "blocks", "unsafe", "annotate"]
  files: ["**/*.rs"]
  symbols: ["extern", "safe"]
related: ["rust-unsafe-no-mangle-unsafe", "rust-type-repr-transparent"]
sources:
  - title: "rust-skills: unsafe-extern-block"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/unsafe-extern-block.md
---
> In Rust 2024, wrap `extern` blocks in `unsafe extern { }` and annotate each item as `safe` or `unsafe`.

## Why

> Note: the Bad snippet intentionally does not compile on Rust 2024 (bare `extern` blocks are rejected; they must be `unsafe extern`).

Before Rust 2024, every function declared inside an `extern "C" { }` block was implicitly unsafe to call — but the block itself carried no `unsafe` keyword. This made it easy to forget that the FFI contract (correct types, valid pointers, no aliasing violations) was entirely the programmer's responsibility. Rust 2024 makes this explicit: the block must be `unsafe extern`, which signals that the *programmer* is asserting the declarations are accurate. Individual items can then be marked `safe` (callable without an `unsafe` block by the caller) or `unsafe` (the default — caller must use `unsafe {}`).

This change makes FFI boundaries auditable at a glance and lets wrappers expose a safe API while keeping raw declarations accurate.

## Bad

```rust
// Rust 2021 style — compiles but forbidden in 2024 edition
extern "C" {
    fn strlen(s: *const std::ffi::c_char) -> usize;
    fn memcpy(dst: *mut u8, src: *const u8, n: usize) -> *mut u8;
    static errno: std::ffi::c_int;
}
```

## Good

```rust
// Rust 2024 style
unsafe extern "C" {
    // `strlen` is genuinely unsafe: caller must pass a null-terminated pointer.
    pub unsafe fn strlen(s: *const std::ffi::c_char) -> usize;

    // `memcpy` is unsafe: caller must ensure non-overlapping, valid regions.
    pub unsafe fn memcpy(dst: *mut u8, src: *const u8, n: usize) -> *mut u8;

    // A function that is always safe to call (hypothetical pure query).
    pub safe fn rust_version_major() -> u32;

    // Statics are unsafe to access unless you can guarantee no data races.
    pub unsafe static errno: std::ffi::c_int;
}

// Call sites remain unchanged for `unsafe` items:
fn copy_bytes(dst: *mut u8, src: *const u8, n: usize) {
    // SAFETY: dst and src are non-overlapping, both valid for n bytes.
    unsafe { memcpy(dst, src, n) };
}

// Call sites for `safe` items need no unsafe block:
fn show_version() {
    println!("major: {}", rust_version_major());
}
```

## See Also

- [rust-unsafe-no-mangle-unsafe](unsafe-no-mangle-unsafe.md) - mark `#[no_mangle]` as `#[unsafe(no_mangle)]` in Rust 2024
- [rust-type-repr-transparent](type-repr-transparent.md) - use `#[repr(transparent)]` for FFI newtypes
