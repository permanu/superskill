---
id: rust-obs-instrument-spans
lang: rust
prefix: obs
title: "Use `#[tracing::instrument]` and spans to attach context to async tasks and requests"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["instrument", "spans", "tracing", "attach", "context", "async", "tasks", "requests"]
  files: ["**/*.rs"]
  symbols: ["tracing::instrument"]
related: ["rust-obs-structured-fields", "rust-obs-no-sensitive-data", "rust-async-no-lock-await"]
sources:
  - title: "rust-skills: obs-instrument-spans"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/obs-instrument-spans.md
---
> Use `#[tracing::instrument]` and spans to attach context to async tasks and requests

## Why

A span groups all events emitted during a logical operation (an HTTP request, a database call, a background job) and attaches structured context to every event within it. Without spans, log lines from concurrent async tasks interleave with no way to correlate them. The `#[tracing::instrument]` attribute creates a span automatically from the function's arguments as fields. There is one critical async pitfall: holding a span *entry guard* (`let _g = span.enter()`) across an `.await` point attaches the span to the wrong task when the executor resumes on a different thread — use `.instrument(span)` on the future instead.

## Bad

```rust
use tracing::{info, span, Level};

// BAD: holding an entry guard across .await corrupts span context
async fn fetch_user(user_id: u64) -> Result<String, String> {
    let span = span!(Level::INFO, "fetch_user", user_id);
    let _guard = span.enter(); // Guard taken before the await

    let result = some_async_db_call(user_id).await; // Guard still held: wrong task context!
    info!("fetched user");
    result
}

async fn some_async_db_call(_id: u64) -> Result<String, String> {
    Ok("alice".to_string())
}
```

## Good

```rust
use tracing::{info, info_span, instrument, Instrument};

// #[instrument] handles async correctly; skip large or sensitive args
#[instrument(fields(user.id = user_id))]
async fn fetch_user(user_id: u64) -> Result<String, String> {
    info!("fetching user");
    Ok("alice".to_string())
}

// Manual span + .instrument() for dynamic span names
async fn process_job(job_id: &str) {
    let span = info_span!("process_job", job.id = job_id);
    async move {
        info!("job complete");
    }
    .instrument(span)
    .await;
}
```

## See Also

- [rust-obs-structured-fields](obs-structured-fields.md) - Structured fields within span events
- [rust-obs-no-sensitive-data](obs-no-sensitive-data.md) - Use `skip` to prevent secrets leaking into spans
- [rust-async-no-lock-await](async-no-lock-await.md) - Same problem pattern: do not hold guards across `.await`
