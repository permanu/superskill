---
id: rust-api-builder-pattern
lang: rust
prefix: api
title: "Use Builder pattern for complex construction"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["builder", "pattern", "complex", "construction"]
  files: ["**/*.rs"]
related: ["rust-api-builder-must-use", "rust-api-typestate", "rust-api-impl-into"]
sources:
  - title: "rust-skills: api-builder-pattern"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-builder-pattern.md
  - title: "github.com/seanmonstar/reqwest/blob/master/src/async_impl/client.rs"
    url: https://github.com/seanmonstar/reqwest/blob/master/src/async_impl/client.rs
---
> Use Builder pattern for complex construction

## Why

When a type has many optional parameters or complex initialization, the Builder pattern provides a clear, flexible API. It avoids constructors with many parameters (which are error-prone) and makes the code self-documenting.

## Bad

```rust
struct Client;
impl Client {
    fn new(
        _url: &str,
        _timeout: u64,
        _flag: bool,
        _opt: Option<()>,
        _token: Option<&str>,
    ) -> Self {
        Client
    }
}

fn main() {
    // Constructor with many parameters - hard to read, easy to get wrong
    let client = Client::new(
        "https://api.example.com", // Which is which?
        30,                        // Timeout? Retries?
        true,                      // What does this mean?
        None,
        Some("auth_token"),
    );
    let _ = client;
}
```

## Good

```rust
pub struct Client { base_url: String, timeout_secs: u64 }
#[derive(Default)]
pub struct ClientBuilder { base_url: Option<String>, timeout_secs: Option<u64> }
impl ClientBuilder {
    pub fn base_url(mut self, url: impl Into<String>) -> Self {
        self.base_url = Some(url.into());
        self
    }
    pub fn timeout_secs(mut self, secs: u64) -> Self {
        self.timeout_secs = Some(secs);
        self
    }
    pub fn build(self) -> Result<Client, &'static str> {
        Ok(Client {
            base_url: self.base_url.ok_or("base_url is required")?,
            timeout_secs: self.timeout_secs.unwrap_or(30),
        })
    }
}
fn make_client() -> Result<Client, &'static str> {
    ClientBuilder::default()
        .base_url("https://api.example.com")
        .timeout_secs(10)
        .build()
}
```

## See Also

- [rust-api-builder-must-use](api-builder-must-use.md) - Add #[must_use] to builders
- [rust-api-typestate](api-typestate.md) - Compile-time state machines
- [rust-api-impl-into](api-impl-into.md) - Accept impl Into for flexibility
