---
id: rust-name-consts-screaming
lang: rust
prefix: name
title: "Use `SCREAMING_SNAKE_CASE` for constants and statics"
severity: should
enforce: tool
tool: rustc::non_upper_case_globals
baseline: latest
status: verified
triggers:
  keywords: ["consts", "screaming", "screaming_snake_case", "constants", "statics"]
  files: ["**/*.rs"]
  symbols: ["SCREAMING_SNAKE_CASE"]
related: ["rust-name-funcs-snake", "rust-name-types-camel", "rust-type-newtype-ids"]
sources:
  - title: "rust-skills: name-consts-screaming"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-consts-screaming.md
---
> Use `SCREAMING_SNAKE_CASE` for constants and statics

## Why

Constants and statics are special—they're known at compile time and have program-wide lifetime. `SCREAMING_SNAKE_CASE` makes them visually distinct from runtime variables. This convention is enforced by the compiler and universally expected.

## Bad

```rust
use std::sync::atomic::AtomicU64;

// lowercase/camelCase constants - compiler warns
const maxConnections: u32 = 100;  // warning
const default_timeout: u64 = 30;  // warning
static globalCounter: AtomicU64 = AtomicU64::new(0);  // warning
```

## Good

```rust
use std::sync::OnceLock;
use std::sync::atomic::AtomicU64;
use std::time::Duration;

// SCREAMING_SNAKE_CASE for constants
const MAX_CONNECTIONS: u32 = 100;
const DEFAULT_TIMEOUT: Duration = Duration::from_secs(30);
const BUFFER_SIZE: usize = 4096;

// SCREAMING_SNAKE_CASE for statics
static GLOBAL_COUNTER: AtomicU64 = AtomicU64::new(0);
static CONFIG: OnceLock<Config> = OnceLock::new();

struct Config;
struct Buffer;

// Type-level constants in impl blocks
impl Buffer {
    const INITIAL_CAPACITY: usize = 1024;
    const MAX_CAPACITY: usize = 1024 * 1024;
}
```

## See Also

- [rust-name-funcs-snake](name-funcs-snake.md) - Function/variable naming
- [rust-name-types-camel](name-types-camel.md) - Type naming
- [rust-type-newtype-ids](type-newtype-ids.md) - Type-safe constants
