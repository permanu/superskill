---
id: rust-own-refcell-interior
lang: rust
prefix: own
title: "Use `RefCell<T>` for interior mutability in single-threaded code"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["refcell", "interior", "mutability", "single-threaded", "code"]
  files: ["**/*.rs"]
  symbols: ["RefCell"]
related: ["rust-own-rc-single-thread", "rust-own-mutex-interior", "rust-conc-thread-local"]
sources:
  - title: "rust-skills: own-refcell-interior"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/own-refcell-interior.md
---
> Use `RefCell<T>` for interior mutability in single-threaded code

## Why

Rust's borrow checker enforces rules at compile time, but sometimes you need to mutate data through a shared reference. `RefCell<T>` moves borrow checking to runtime, allowing mutation through `&self`. This is essential for patterns like caches, lazy initialization, and observer patterns where compile-time borrowing is too restrictive.

## Bad

```rust
use std::collections::HashMap;

struct Cache {
    // Requires &mut self to update, breaking shared reference patterns
    data: HashMap<String, String>,
}

impl Cache {
    fn get_or_compute(&mut self, key: &str) -> &str {
        // Caller needs &mut Cache, can't share cache reference
        if !self.data.contains_key(key) {
            self.data.insert(key.to_string(), expensive_compute(key));
        }
        &self.data[key]
    }
}

fn expensive_compute(key: &str) -> String {
    key.to_uppercase()
}

// This forces exclusive access even for logically shared operations.
```

## Good

```rust
use std::{cell::RefCell, collections::HashMap};

struct Cache {
    data: RefCell<HashMap<String, String>>,
}

impl Cache {
    fn get_or_compute(&self, key: &str) -> String {
        let mut data = self.data.borrow_mut();  // mutate through &self
        if !data.contains_key(key) {
            data.insert(key.to_string(), expensive_compute(key));
        }
        data[key].clone()
    }
}

fn expensive_compute(key: &str) -> String {
    key.to_uppercase()
}
fn main() {
    let cache = Cache { data: RefCell::new(HashMap::new()) };
    let (a, b) = (&cache, &cache);
    a.get_or_compute("key1");
    b.get_or_compute("key2");
}
```

## See Also

- [rust-own-rc-single-thread](own-rc-single-thread.md) - Combining with Rc for shared ownership
- [rust-own-mutex-interior](own-mutex-interior.md) - Thread-safe alternative
- [rust-conc-thread-local](conc-thread-local.md) - `thread_local!` with `Cell`/`RefCell` for per-thread state
