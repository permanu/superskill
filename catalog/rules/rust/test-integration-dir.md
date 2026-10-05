---
id: rust-test-integration-dir
lang: rust
prefix: test
title: "Put integration tests in the `tests/` directory"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["integration", "dir", "put", "tests", "directory"]
  files: ["**/*.rs"]
related: ["rust-test-cfg-test-module", "rust-test-descriptive-names", "rust-test-tokio-async"]
sources:
  - title: "rust-skills: test-integration-dir"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-integration-dir.md
---
> Put integration tests in the `tests/` directory

## Why

Integration tests live in `tests/` at the crate root, separate from `src/`. Each file in `tests/` is compiled as a separate crate, testing your library's public API as external users would. This separation ensures you're testing the real public interface, not implementation details.

## Bad

```rust
// src/lib.rs
// Mixing integration test logic in library code
#[test]
fn integration_test_full_workflow() {
    // This is a unit test location, not integration
}
```

## Good

```rust
// tests/integration_test.rs
// In a real project this module comes from the crate under test
mod my_crate {
    pub struct Config;
    impl Config {
        pub fn default() -> Self { Config }
        pub fn strict() -> Self { Config }
    }
    pub struct Client;
    impl Client {
        pub fn new(_config: Config) -> Self { Client }
        pub fn process(&self, _input: &str) -> Result<(), Error> { Ok(()) }
    }
    #[derive(Debug)]
    pub enum Error { InvalidInput { reason: String } }
}

use my_crate::{Client, Config, Error}; // public API only

#[test]
fn test_full_workflow() {
    let client = Client::new(Config::default());
    let result = client.process("input");
    assert!(result.is_ok());
}
```

## See Also

- [rust-test-cfg-test-module](test-cfg-test-module.md) - Unit test modules
- [rust-test-descriptive-names](test-descriptive-names.md) - Test naming
- [rust-test-tokio-async](test-tokio-async.md) - Async integration tests
