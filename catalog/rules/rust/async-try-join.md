---
id: rust-async-try-join
lang: rust
prefix: async
title: "Use `try_join!` for concurrent fallible operations with early return on error"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["try", "join", "try_join", "concurrent", "fallible", "operations", "early", "return"]
  files: ["**/*.rs"]
  symbols: ["try_join"]
related: ["rust-async-join-parallel", "rust-async-select-racing", "rust-err-question-mark"]
sources:
  - title: "rust-skills: async-try-join"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-try-join.md
---
> Use `try_join!` for concurrent fallible operations with early return on error

## Why

When running multiple fallible operations concurrently, `try_join!` returns `Err` as soon as any future fails, without waiting for the others. This provides fail-fast behavior while still running operations in parallel. For many operations, use `futures::future::try_join_all`.

## Bad

```rust
use tokio::join;

#[derive(Debug)] struct A;
#[derive(Debug)] struct B;
#[derive(Debug)] struct C;
#[derive(Debug)] struct E;

async fn fetch_a() -> Result<A, E> { Ok(A) }
async fn fetch_b() -> Result<B, E> { Ok(B) }
async fn fetch_c() -> Result<C, E> { Ok(C) }

// Sequential awaits have no early-return benefit across operations.
async fn fetch_all() -> Result<(A, B, C), E> {
    let a = fetch_a().await?;
    let b = fetch_b().await?;
    let c = fetch_c().await?;
    Ok((a, b, c))
}

// join! runs everything and hands back three Results to unwrap by hand.
async fn fetch_all_ignore_errors() -> (Result<A, E>, Result<B, E>, Result<C, E>) {
    join!(fetch_a(), fetch_b(), fetch_c())
}
```

## Good

```rust
use anyhow::Result;
use tokio::try_join;

struct A;
struct B;
struct C;
struct User;

async fn fetch_a() -> Result<A> { Ok(A) }
async fn fetch_b() -> Result<B> { Ok(B) }
async fn fetch_c() -> Result<C> { Ok(C) }
async fn fetch_user(_id: u64) -> Result<User> { Ok(User) }

async fn fetch_all() -> Result<(A, B, C)> {
    // Concurrent AND fail-fast
    let (a, b, c) = try_join!(fetch_a(), fetch_b(), fetch_c())?;
    Ok((a, b, c))
}

use futures::future::try_join_all;

async fn fetch_users(ids: &[u64]) -> Result<Vec<User>> {
    let futures: Vec<_> = ids.iter().map(|id| fetch_user(*id)).collect();
    try_join_all(futures).await
}
```

## See Also

- [rust-async-join-parallel](async-join-parallel.md) - Non-fallible concurrent futures
- [rust-async-select-racing](async-select-racing.md) - First-to-complete semantics
- [rust-err-question-mark](err-question-mark.md) - Error propagation
