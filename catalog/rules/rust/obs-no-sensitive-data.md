---
id: rust-obs-no-sensitive-data
lang: rust
prefix: obs
title: "Never log secrets or PII; redact or skip them"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["sensitive", "data", "log", "secrets", "pii", "redact", "skip", "them"]
  files: ["**/*.rs"]
related: ["rust-obs-instrument-spans", "rust-obs-structured-fields", "rust-err-thiserror-lib"]
sources:
  - title: "rust-skills: obs-no-sensitive-data"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/obs-no-sensitive-data.md
---
> Never log secrets or PII; redact or skip them

## Why

Logs and traces are routinely shipped to cloud aggregators (Datadog, Grafana Loki, Splunk) and retained for weeks or months. If a password, API token, session cookie, or piece of PII (email, SSN, health data) appears in a log line or span field, it leaks into systems with weaker access controls than your secrets manager, appears in support exports, and may violate GDPR/HIPAA/PCI-DSS. The fix is cheap: use `#[instrument(skip(...))]` or `skip_all` to exclude sensitive arguments, and wrap sensitive types in a redacting newtype or use the `secrecy` crate's `Secret<T>` which prints `[redacted]` from both `Debug` and `Display`.

## Bad

```rust
use tracing::instrument;

#[derive(Debug)]
struct Credentials {
    username: String,
    password: String,   // secret
    api_key: String,    // secret
}

// BAD: instrument auto-captures all args as fields — password becomes a span field
#[instrument]
async fn authenticate(credentials: &Credentials) -> bool {
    // Also BAD: manual logging of the whole struct
    tracing::info!(?credentials, "authenticating user");
    true
}
```

## Good

```rust
use tracing::{info, instrument};
// A simple redacting newtype for any sensitive type
struct Secret(String);

impl std::fmt::Debug for Secret {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result { f.write_str("[redacted]") }
}

impl std::fmt::Display for Secret {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result { f.write_str("[redacted]") }
}

struct Credentials {
    username: String,
    password: Secret,   // redacts in Debug/Display
    api_key: Secret,    // redacts in Debug/Display
}

// Skip sensitive args by name
#[instrument(skip(credentials), fields(username = %credentials.username))]
async fn authenticate(credentials: &Credentials) -> bool {
    info!("authenticating user");
    verify_password(&credentials.username, &credentials.password)
}
fn verify_password(_username: &str, _password: &Secret) -> bool { true }
```

## See Also

- [rust-obs-instrument-spans](obs-instrument-spans.md) - How to use `#[instrument]` and spans correctly
- [rust-obs-structured-fields](obs-structured-fields.md) - Structured fields must be safe to emit
- [rust-err-thiserror-lib](err-thiserror-lib.md) - Defining error types that don't accidentally expose secrets
