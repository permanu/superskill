---
id: rust-async-join-parallel
lang: rust
prefix: async
title: "Use `join!` or `try_join!` for concurrent independent futures"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["join", "parallel", "try_join", "concurrent", "independent", "futures"]
  files: ["**/*.rs"]
  symbols: ["join", "try_join"]
related: ["rust-async-try-join", "rust-async-select-racing", "rust-async-joinset-structured"]
sources:
  - title: "rust-skills: async-join-parallel"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-join-parallel.md
---
> Use `join!` or `try_join!` for concurrent independent futures

## Why

Awaiting futures sequentially takes the sum of their durations. `join!` runs futures concurrently, taking only as long as the slowest one. For independent operations like multiple API calls or parallel file reads, this can dramatically reduce latency.

## Bad

```rust
use tokio::fs;

struct User;
struct Posts;

async fn fetch_user() -> User { User }
async fn fetch_posts() -> Posts { Posts }

async fn fetch_data() -> (User, Posts) {
    // Sequential: 200ms total (100 + 100)
    let user = fetch_user().await;
    let posts = fetch_posts().await;
    (user, posts)
}

async fn read_configs() -> std::io::Result<(String, String)> {
    // Sequential: 20ms + 20ms = 40ms
    let config = fs::read_to_string("config.toml").await?;
    let settings = fs::read_to_string("settings.json").await?;
    Ok((config, settings))
}
```

## Good

```rust
use tokio::{fs, join, try_join};

struct User;
struct Posts;

async fn fetch_user() -> User { User }
async fn fetch_posts() -> Posts { Posts }

async fn fetch_data() -> (User, Posts) {
    // Concurrent: ~200ms total (max of both)
    let (user, posts) = join!(fetch_user(), fetch_posts());
    (user, posts)
}

async fn read_configs() -> std::io::Result<(String, String)> {
    // Concurrent: ~20ms total
    let (config, settings) = try_join!(
        fs::read_to_string("config.toml"),
        fs::read_to_string("settings.json"),
    )?;
    Ok((config, settings))
}
```

## See Also

- [rust-async-try-join](async-try-join.md) - Error handling in concurrent futures
- [rust-async-select-racing](async-select-racing.md) - Racing futures
- [rust-async-joinset-structured](async-joinset-structured.md) - Dynamic task sets
