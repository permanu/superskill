---
id: rust-api-impl-asref
lang: rust
prefix: api
title: "Use `AsRef<T>` when you only need to borrow the inner data"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["impl", "asref", "borrow", "inner", "data"]
  files: ["**/*.rs"]
  symbols: ["AsRef"]
related: ["rust-api-impl-into", "rust-own-slice-over-vec", "rust-own-borrow-over-clone"]
sources:
  - title: "rust-skills: api-impl-asref"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-impl-asref.md
---
> Use `AsRef<T>` when you only need to borrow the inner data

## Why

`AsRef<T>` provides a cheap borrowed view of data without taking ownership or copying. Functions accepting `impl AsRef<T>` can work with multiple types that contain or represent `T`, making APIs flexible while avoiding unnecessary allocations. Use `AsRef` when you only need to read, `Into` when you need to own.

## Bad

```rust
use std::path::{Path, PathBuf};

// Forces callers to provide exact types
fn process_text(text: &str) {
    let _ = text;
}
fn read_file(path: &Path) {
    let _ = path;
}

fn main() {
    // Can't call directly with owned types
    let s = String::from("hello");
    process_text(&s);  // Works but verbose

    let p = PathBuf::from("/file");
    read_file(&p);  // Works but verbose
    // read_file("/file");  // Error! &str != &Path
}
```

## Good

```rust
use std::borrow::Cow;
use std::ffi::OsStr;
use std::io;
use std::path::{Path, PathBuf};

// Accept anything that can be viewed as the target type
fn process_text(text: impl AsRef<str>) {
    let s: &str = text.as_ref();
    println!("{}", s);
}

fn read_file(path: impl AsRef<Path>) -> io::Result<Vec<u8>> {
    std::fs::read(path.as_ref())
}
fn main() {
    // All of these work:
    process_text("literal");        // &str
    process_text(String::from("owned"));  // String
    process_text(Cow::from("cow")); // Cow<str>

    let _ = read_file("/path/to/file");     // &str  
    let _ = read_file(Path::new("/path"));  // &Path
    let _ = read_file(PathBuf::from("/path")); // PathBuf
    let _ = read_file(OsStr::new("/path")); // &OsStr
}
```

## See Also

- [rust-api-impl-into](api-impl-into.md) - When to use Into instead
- [rust-own-slice-over-vec](own-slice-over-vec.md) - Using slices for flexibility
- [rust-own-borrow-over-clone](own-borrow-over-clone.md) - Preferring borrows
