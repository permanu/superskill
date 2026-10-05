---
id: rust-serde-try-from-validate
lang: rust
prefix: serde
title: "Validate while deserializing with `#[serde(try_from = \"Raw\")]`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["try", "validate", "while", "deserializing", "serde", "try_from", "raw"]
  files: ["**/*.rs"]
  symbols: ["serde"]
related: ["rust-api-parse-dont-validate", "rust-type-newtype-validated", "rust-serde-custom-with"]
sources:
  - title: "rust-skills: serde-try-from-validate"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/serde-try-from-validate.md
---
> Validate while deserializing with `#[serde(try_from = "Raw")]`

## Why

Running validation after deserialization means you can construct an invalid value in memory, even briefly. Parse-don't-validate says to make invalid states unrepresentable. `#[serde(try_from = "Raw")]` wires the deserializer directly through a `TryFrom` conversion: serde reads the raw type, then your conversion either produces the validated value or returns an error — so an invalid instance is never constructed.

## Bad

```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Email(String);

impl Email {
    fn new(s: String) -> Result<Self, String> {
        if s.contains('@') {
            Ok(Email(s))
        } else {
            Err(format!("invalid email: {s}"))
        }
    }
}

// Caller must validate after deserialization — easy to forget:
fn process(json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let email: Email = serde_json::from_str(json)?;
    // nothing stops "notanemail" from being deserialized and used
    println!("{:?}", email);
    Ok(())
}
```

## Good

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(try_from = "String")]
struct Email(String);

impl TryFrom<String> for Email {
    type Error = String;

    fn try_from(s: String) -> Result<Self, Self::Error> {
        if s.contains('@') && !s.starts_with('@') && !s.ends_with('@') {
            Ok(Email(s))
        } else {
            Err(format!("invalid email address: {s}"))
        }
    }
}

fn main() {
    let email: Email = serde_json::from_str("\"user@example.com\"").unwrap();
    assert!(serde_json::from_str::<Email>("\"notanemail\"").is_err());
    println!("{email:?}");
}
```

## See Also

- [rust-api-parse-dont-validate](api-parse-dont-validate.md) - Parse into validated types at boundaries
- [rust-type-newtype-validated](type-newtype-validated.md) - Newtypes for validated data
- [rust-serde-custom-with](serde-custom-with.md) - Customize field (de)serialization with with modules
