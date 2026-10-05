---
id: rust-perf-entry-api
lang: rust
prefix: perf
title: "Use entry API for map insert-or-update"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["entry", "api", "map", "insert-or-update"]
  files: ["**/*.rs"]
related: ["rust-perf-extend-batch", "rust-mem-with-capacity", "rust-perf-drain-reuse", "rust-coll-map-choice"]
sources:
  - title: "rust-skills: perf-entry-api"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/perf-entry-api.md
---
> Use entry API for map insert-or-update

## Why

The entry API performs a single lookup for insert-or-update operations. Without it, you lookup twice: once to check existence, once to insert. For `HashMap` and `BTreeMap`, the entry API is both faster and more idiomatic.

## Bad

```rust
use std::collections::HashMap;
struct Config { value: i32 }

fn increment(map: &mut HashMap<String, u32>, key: String) {
    if map.contains_key(&key) {
        *map.get_mut(&key).unwrap() += 1;
    } else {
        map.insert(key, 1);
    }
}

fn get_or_insert(map: &mut HashMap<String, Vec<i32>>, key: String) -> &mut Vec<i32> {
    if !map.contains_key(&key) {
        map.insert(key.clone(), Vec::new());
    }
    map.get_mut(&key).unwrap()
}

fn update(map: &mut HashMap<String, Config>, key: String, value: i32) {
    if map.contains_key(&key) {
        map.insert(key, Config { value });
    } else {
        map.insert(key, Config { value: 0 });
    }
}
```

## Good

```rust
use std::collections::HashMap;
use std::collections::hash_map::Entry;

#[derive(Clone, Default)]
struct Config {
    value: i32,
}

// Single lookup with entry
fn increment(map: &mut HashMap<String, u32>, key: String) {
    *map.entry(key).or_insert(0) += 1;
}

// Single lookup, returns mutable reference
fn get_or_insert(map: &mut HashMap<String, Vec<i32>>, key: String) -> &mut Vec<i32> {
    map.entry(key).or_insert_with(Vec::new)
}

// Single lookup with and_modify
fn update_or_default(map: &mut HashMap<String, Config>, key: String, value: i32) {
    map.entry(key)
        .and_modify(|config| config.value = value)
        .or_insert_with(Config::default);
}
```

## See Also

- [rust-perf-extend-batch](perf-extend-batch.md) - Batch insertions
- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocate maps
- [rust-perf-drain-reuse](perf-drain-reuse.md) - Reuse map allocations
- [rust-coll-map-choice](coll-map-choice.md) - Pick the right map type
