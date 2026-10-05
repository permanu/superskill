---
id: rust-err-lowercase-msg
lang: rust
prefix: err
title: "Start error messages lowercase, no trailing punctuation"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["lowercase", "msg", "start", "error", "messages", "trailing", "punctuation"]
  files: ["**/*.rs"]
related: ["rust-err-thiserror-lib", "rust-err-context-chain", "rust-doc-examples-section"]
sources:
  - title: "rust-skills: err-lowercase-msg"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/err-lowercase-msg.md
---
> Start error messages lowercase, no trailing punctuation

## Why

Error messages get chained, logged, or displayed with additional context. Consistent formatting—lowercase start, no trailing period—allows clean composition: "failed to load config: invalid JSON: unexpected token". Mixed case and punctuation create awkward output: "Failed to load config.: Invalid JSON.: Unexpected token.".

## Bad

```rust
use thiserror::Error;

#[derive(Error, Debug)]
enum ConfigError {
    #[error("Failed to read config file.")]  // Capital F, trailing period
    ReadFailed(#[from] std::io::Error),
    
    #[error("Invalid JSON format!")]  // Capital I, exclamation
    ParseFailed(#[from] serde_json::Error),
    
    #[error("The requested key was not found")]  // Reads like a sentence
    KeyNotFound(String),
}

// Chained output: "Config load error: Failed to read config file.: No such file"
// Awkward capitalization and punctuation
```

## Good

```rust
use thiserror::Error;

#[derive(Error, Debug)]
enum ConfigError {
    #[error("failed to read config file")]  // lowercase, no period
    ReadFailed(#[from] std::io::Error),
    
    #[error("invalid JSON format")]  // lowercase, no period
    ParseFailed(#[from] serde_json::Error),
    
    #[error("key not found: {0}")]  // lowercase, data at end
    KeyNotFound(String),
}

// Chained output: "config load error: failed to read config file: no such file"
// Clean, consistent
```

## See Also

- [rust-err-thiserror-lib](err-thiserror-lib.md) - Error definition with thiserror
- [rust-err-context-chain](err-context-chain.md) - Adding context to errors
- [rust-doc-examples-section](doc-examples-section.md) - Documentation conventions
