---
id: rust-api-impl-into
lang: rust
prefix: api
title: "Accept `impl Into<T>` for flexible APIs, implement `From<T>` for conversions"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["impl", "accept", "flexible", "apis", "implement", "conversions"]
  files: ["**/*.rs"]
  symbols: ["From"]
related: ["rust-api-impl-asref", "rust-api-from-not-into", "rust-err-from-impl"]
sources:
  - title: "rust-skills: api-impl-into"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-impl-into.md
---
> Accept `impl Into<T>` for flexible APIs, implement `From<T>` for conversions

## Why

APIs that accept `impl Into<T>` are ergonomic—callers can pass the target type directly or any type that converts to it. This reduces boilerplate `.into()` calls at call sites. Implement `From<T>` rather than `Into<T>` because `From` implies `Into` through a blanket implementation.

## Bad

```rust
use std::path::PathBuf;

// Requires exact type - forces callers to convert
fn process_path(path: PathBuf) {
    let _ = path;
}
fn set_name(name: String) {
    let _ = name;
}

fn main() {
    // Caller must convert explicitly
    process_path(PathBuf::from("/path/to/file"));
    process_path(std::path::Path::new("/path/to/file").to_path_buf());  // Verbose
    process_path("/path/to/file".into());          // Explicit

    set_name(String::from("Alice"));
    set_name("Alice".to_string());  // Verbose
}
```

## Good

```rust
use std::path::PathBuf;

// Accept anything that converts to the target type
fn process_path(path: impl Into<PathBuf>) {
    let path = path.into();  // Convert once inside
    let _ = path;
}

fn set_name(name: impl Into<String>) {
    let name = name.into();
    let _ = name;
}

fn main() {
    let id = 42;

    // Callers are ergonomic
    process_path("/path/to/file");    // &str converts automatically
    process_path(PathBuf::from(".")); // PathBuf works too

    set_name("Alice");                // &str
    set_name(String::from("Alice"));  // String
    set_name(format!("User-{}", id)); // String from format!
}
```

## See Also

- [rust-api-impl-asref](api-impl-asref.md) - When to use AsRef instead
- [rust-api-from-not-into](api-from-not-into.md) - Why From is preferred
- [rust-err-from-impl](err-from-impl.md) - From for error conversion
