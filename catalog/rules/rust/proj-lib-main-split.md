---
id: rust-proj-lib-main-split
lang: rust
prefix: proj
title: "Keep `main.rs` minimal, logic in `lib.rs`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["lib", "main", "split", "keep", "minimal", "logic"]
  files: ["**/*.rs"]
related: ["rust-proj-bin-dir", "rust-proj-mod-by-feature", "rust-test-integration-dir"]
sources:
  - title: "rust-skills: proj-lib-main-split"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/proj-lib-main-split.md
---
> Keep `main.rs` minimal, logic in `lib.rs`

## Why

Putting your logic in `lib.rs` makes it testable, reusable, and keeps `main.rs` as a thin entry point. Integration tests can only access your library crate, not binary code in `main.rs`.

## Bad

```rust
// src/main.rs - all logic lives here
#[derive(Debug)]
struct Error;
struct Args { config_path: String }
struct Config { db_url: String }
struct Db;

fn main() {
    let args = parse_args();
    let config = load_config(&args.config_path).unwrap();
    let db = connect_database(&config.db_url).unwrap();
    // Hundreds of lines of application logic follow,
    // all untestable from integration tests.
    let _ = db;
}

fn parse_args() -> Args { Args { config_path: String::new() } }
fn load_config(path: &str) -> Result<Config, Error> { let _ = path; Ok(Config { db_url: String::new() }) }
fn connect_database(url: &str) -> Result<Db, Error> { let _ = url; Ok(Db) }
// More functions that integration tests cannot reach.
```

## Good

```rust
// src/main.rs - thin entry point
fn main() -> anyhow::Result<()> {
    let config = Config::from_env()?;
    run(config)
}

// src/lib.rs - all the logic, testable by integration tests
pub mod config {
    pub struct Config { pub db_url: String }
    impl Config {
        pub fn from_env() -> anyhow::Result<Self> {
            Ok(Config { db_url: String::new() })
        }
    }
}

pub mod database {
    pub struct Db;
    pub fn connect(_url: &str) -> anyhow::Result<Db> { Ok(Db) }
}

pub use config::Config;

pub fn run(config: Config) -> anyhow::Result<()> { let db = database::connect(&config.db_url)?; let _ = db; Ok(()) }
```

## See Also

- [rust-proj-bin-dir](proj-bin-dir.md) - Put multiple binaries in src/bin/
- [rust-proj-mod-by-feature](proj-mod-by-feature.md) - Organize modules by feature
- [rust-test-integration-dir](test-integration-dir.md) - Integration tests in tests/
