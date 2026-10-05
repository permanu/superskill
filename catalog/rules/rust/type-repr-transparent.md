---
id: rust-type-repr-transparent
lang: rust
prefix: type
title: "Use `#[repr(transparent)]` for newtypes in FFI contexts"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["repr", "transparent", "newtypes", "ffi", "contexts"]
  files: ["**/*.rs"]
  symbols: ["repr"]
related: ["rust-type-newtype-ids", "rust-type-phantom-marker", "rust-api-newtype-safety"]
sources:
  - title: "rust-skills: type-repr-transparent"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/type-repr-transparent.md
---
> Use `#[repr(transparent)]` for newtypes in FFI contexts

## Why

`#[repr(transparent)]` guarantees a newtype has the same memory layout as its inner type. This is essential for FFI where you need type safety in Rust but must match C ABI layouts. Without it, the compiler may add padding or change layout.

## Bad

```rust
use std::ffi::c_void;

// No layout guarantee - might not match inner type in FFI
struct Handle(u64);

// Passing to C code might fail
unsafe extern "C" {
    fn process_handle(h: Handle);  // May not work correctly
}

// Wrapping C type without layout guarantee
struct SafePointer(*mut c_void);
```

## Good

```rust
use std::ffi::c_void;

// Guaranteed same layout as inner type
#[repr(transparent)]
struct Handle(u64);

// Safe for FFI
unsafe extern "C" {
    fn process_handle(h: Handle);  // Works - same layout as u64
}

// FFI pointer wrapper
#[repr(transparent)]
struct SafePointer(*mut c_void);

impl SafePointer {
    // Safe Rust API around raw pointer
    pub fn new(ptr: *mut c_void) -> Option<Self> {
        if ptr.is_null() {
            None
        } else {
            Some(SafePointer(ptr))
        }
    }
}
```

## See Also

- [rust-type-newtype-ids](type-newtype-ids.md) - Newtype pattern
- [rust-type-phantom-marker](type-phantom-marker.md) - PhantomData usage
- [rust-api-newtype-safety](api-newtype-safety.md) - Type-safe newtypes
