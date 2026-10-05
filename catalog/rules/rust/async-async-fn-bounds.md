---
id: rust-async-async-fn-bounds
lang: rust
prefix: async
title: "Use `AsyncFn`/`AsyncFnMut`/`AsyncFnOnce` bounds instead of `F: Fn() -> Fut, Fut: Future`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["async", "bounds", "asyncfn", "asyncfnmut", "asyncfnonce", "fut", "future"]
  files: ["**/*.rs"]
  symbols: ["AsyncFn", "AsyncFnMut", "AsyncFnOnce"]
related: ["rust-async-fn-in-trait", "rust-async-tokio-runtime"]
sources:
  - title: "rust-skills: async-async-fn-bounds"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-async-fn-bounds.md
---
> Use `AsyncFn`/`AsyncFnMut`/`AsyncFnOnce` bounds instead of `F: Fn() -> Fut, Fut: Future`

## Why

The `AsyncFn`, `AsyncFnMut`, and `AsyncFnOnce` traits let you express higher-order async function bounds in a single, readable constraint — and, critically, they handle lifetime capture correctly. The old two-generic pattern `F: Fn() -> Fut, Fut: Future<Output = T>` cannot accept `async ||` closures that borrow from their environment, because the future's lifetime is not linked to the closure's call. `AsyncFn` solves this structurally.

## Bad

```rust
use std::future::Future;

// two-generic pattern: verbose, and cannot accept async closures
// that borrow from their environment across the call
async fn retry<F, Fut, T, E>(times: usize, f: F) -> Result<T, E>
where
    F: Fn() -> Fut,
    Fut: Future<Output = Result<T, E>>,
{
    let mut last_err;
    let mut i = 0;
    loop {
        match f().await {
            Ok(v) => return Ok(v),
            Err(e) => {
                last_err = e;
                i += 1;
                if i >= times {
                    return Err(last_err);
                }
            }
        }
    }
}
```

## Good

```rust
// AsyncFn bound: concise, correct lifetime semantics, accepts async closures
async fn retry<F, T, E>(times: usize, f: F) -> Result<T, E>
where
    F: AsyncFn() -> Result<T, E>,
{
    let mut i = 0;
    loop {
        match f().await {
            Ok(v) => return Ok(v),
            Err(e) if i + 1 >= times => return Err(e),
            Err(_) => i += 1,
        }
    }
}

async fn fetch_data() -> Result<String, std::io::Error> {
    Ok("data".to_owned())
}

async fn example() {
    let _ = retry(3, fetch_data).await;
    let prefix = "prefix".to_owned();
    // async closure borrowing a local across calls
    let _ = retry(3, async || Ok::<_, std::io::Error>(format!("{prefix}-data"))).await;
}
```

## See Also

- [rust-async-fn-in-trait](async-fn-in-trait.md) - Native async fn in trait definitions
- [rust-async-tokio-runtime](async-tokio-runtime.md) - use Tokio for production async runtime
