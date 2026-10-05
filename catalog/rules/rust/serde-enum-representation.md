---
id: rust-serde-enum-representation
lang: rust
prefix: serde
title: "Choose enum tagging deliberately: externally, internally, adjacently tagged, or untagged"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["enum", "representation", "choose", "tagging", "deliberately", "externally", "internally", "adjacently"]
  files: ["**/*.rs"]
related: ["rust-type-enum-states", "rust-api-non-exhaustive", "rust-serde-flatten"]
sources:
  - title: "rust-skills: serde-enum-representation"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/serde-enum-representation.md
---
> Choose enum tagging deliberately: externally, internally, adjacently tagged, or untagged

## Why

Serde's default enum representation (externally tagged) wraps every variant in an object keyed by variant name. That format can clash with external APIs, event systems, or config schemas that use a discriminator field. Picking the wrong tagging strategy produces a mismatch between your wire format and the expected schema, leading to silent parse failures or round-trip data loss.

## Bad

```rust
use serde::{Serialize, Deserialize};

// Default: externally tagged. Serializes as {"Circle":{"radius":5.0}}
// Most REST APIs expect {"type":"circle","radius":5.0} instead.
#[derive(Serialize, Deserialize, Debug)]
enum Shape {
    Circle { radius: f64 },
    Rectangle { width: f64, height: f64 },
}
```

## Good

```rust
use serde::{Deserialize, Serialize};

// Externally tagged (default): {"Circle":{"radius":5.0}}
#[derive(Serialize, Deserialize, Debug)]
enum ShapeExternal { Circle { radius: f64 } }

// Internally tagged: {"type":"Circle","radius":5.0}
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
enum ShapeInternal { Circle { radius: f64 } }

// Adjacently tagged: {"t":"Circle","c":{"radius":5.0}}
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "t", content = "c")]
enum ShapeAdjacent { Circle { radius: f64 }, Count(u32) }

// Untagged: {"radius":5.0}
#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
enum Value { Integer(i64), Text(String) }
```

## See Also

- [rust-type-enum-states](type-enum-states.md) - Use enums for mutually exclusive states
- [rust-api-non-exhaustive](api-non-exhaustive.md) - Use `#[non_exhaustive]` for future-proof enums
- [rust-serde-flatten](serde-flatten.md) - Inline nested struct fields into parent
