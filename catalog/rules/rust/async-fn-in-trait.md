---
id: rust-async-fn-in-trait
lang: rust
prefix: async
title: "Use native `async fn` in traits instead of the `async_trait` macro"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["trait", "native", "async", "traits", "stable", "async_trait", "macro"]
  files: ["**/*.rs"]
  symbols: ["async_trait"]
related: ["rust-anti-type-erasure", "rust-async-async-fn-bounds", "rust-async-tokio-runtime"]
sources:
  - title: "rust-skills: async-fn-in-trait"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-fn-in-trait.md
---
> Use native `async fn` in traits instead of the `async_trait` macro

## Why

Native `async fn` in traits lets you write `async fn` directly inside trait definitions (AFIT — async functions in traits). This eliminates the `#[async_trait]` proc-macro dependency and removes the hidden `Box<dyn Future>` allocation it inserts on every call. Fewer allocations, no macro expansion overhead, and no extra crate to audit. However, native async fn in traits carries two precise caveats you must understand before migrating.

## Bad

```rust
// requires async_trait crate; boxes every future on the heap
use async_trait::async_trait;

#[async_trait]
trait Repo {
    async fn get(&self, id: u64) -> anyhow::Result<String>;
    async fn save(&self, value: String) -> anyhow::Result<()>;
}

struct PgRepo;

#[async_trait]
impl Repo for PgRepo {
    async fn get(&self, id: u64) -> anyhow::Result<String> {
        Ok(format!("row-{id}"))
    }

    async fn save(&self, value: String) -> anyhow::Result<()> {
        let _ = value;
        Ok(())
    }
}
```

## Good

```rust
// native async fn in traits — no macro, no boxing
trait Repo {
    async fn get(&self, id: u64) -> anyhow::Result<String>;
    async fn save(&self, value: String) -> anyhow::Result<()>;
}

struct PgRepo;

impl Repo for PgRepo {
    async fn get(&self, id: u64) -> anyhow::Result<String> {
        Ok(format!("row-{id}"))
    }

    async fn save(&self, value: String) -> anyhow::Result<()> {
        let _ = value;
        Ok(())
    }
}
```

## See Also

- [rust-anti-type-erasure](anti-type-erasure.md) - prefer `impl Trait` over `Box<dyn Trait>` when possible
- [rust-async-async-fn-bounds](async-async-fn-bounds.md) - use `AsyncFn` bounds for higher-order async functions
- [rust-async-tokio-runtime](async-tokio-runtime.md) - use Tokio for production async runtime
