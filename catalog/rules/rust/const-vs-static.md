---
id: rust-const-vs-static
lang: rust
prefix: const
title: "Use `const` for an inlined value and `static` for a single addressed instance"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["static", "const", "inlined", "value", "single", "addressed", "instance"]
  files: ["**/*.rs"]
related: ["rust-name-consts-screaming", "rust-own-mutex-interior"]
sources:
  - title: "rust-skills: const-vs-static"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/const-vs-static.md
---
> Use `const` for an inlined value and `static` for a single addressed instance

## Why

`const` items are substituted at each use site: the compiler copies the value inline, there is no fixed memory address, and the value counts against no storage. This is ideal for small configuration values, bitmasks, and magic numbers. `static` items live at a single address for the entire program lifetime and expose a `'static` reference — use them for large lookup tables you do not want duplicated, or when a `&'static T` is required. Avoid `static mut`: referencing it is a hard error in the 2024 edition. For mutable global state, use atomics (`AtomicUsize`, etc.) or `std::sync::OnceLock`/`std::sync::LazyLock`.

## Bad

```rust
// large table as `const` — potentially duplicated at every use site
const LOOKUP: [u8; 256] = [0u8; 256];

// `static mut` — unsafe to read and a hard error in edition 2024
static mut COUNTER: u64 = 0;

// `static` for a tiny value — needlessly takes an address
static TIMEOUT_MS: u64 = 5000;
```

## Good

```rust
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{LazyLock, OnceLock};

// small values: `const` — inlined at each use, no address needed
const MAX_RETRIES: u32 = 3;
const TIMEOUT_MS: u64 = 5_000;

// large data: `static` — one copy in the binary, shareable as `&'static`
static LOOKUP: [u8; 256] = [0u8; 256];

// mutable global state — use atomics, not `static mut`
static REQUEST_COUNT: AtomicU64 = AtomicU64::new(0);

fn record_request() {
    REQUEST_COUNT.fetch_add(1, Ordering::Relaxed);
}

// lazily initialized global — `LazyLock`
static CONFIG_PATH: LazyLock<String> = LazyLock::new(|| {
    std::env::var("CONFIG_PATH").unwrap_or_else(|_| "/etc/app/config.toml".to_owned())
});

// single-assignment global — `OnceLock`
static GREETING: OnceLock<String> = OnceLock::new();
```

## See Also

- [rust-name-consts-screaming](name-consts-screaming.md) - naming `SCREAMING_SNAKE_CASE` for `const` and `static`
- [rust-own-mutex-interior](own-mutex-interior.md) - use `Mutex<T>` for interior mutability in multi-threaded code
