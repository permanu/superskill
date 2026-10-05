---
id: java-type-record-validate
lang: java
prefix: type
title: "Validate record invariants in the compact canonical constructor"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [record, constructor, invariant, validation]
  files: ["**/*.java"]
  symbols: [IllegalArgumentException]
related: [java-type-record-data-carrier, java-type-record-accessor-invariants]
sources:
  - title: "JEP 395: Records"
    url: https://openjdk.org/jeps/395
---
> Reject invalid record state in the compact canonical constructor so no instance can exist with a broken invariant.

## Why

A record's constructor is the only way to create it, so it is the single place where the type's invariant can be enforced for every caller. JEP 395 shows a compact canonical constructor as the idiomatic spot for validation and normalization: "The compact form helps developers focus on validating and normalizing parameters." Validation in a static factory is bypassable because the canonical constructor remains callable.

## Bad

```java
record Range(int lo, int hi) {
    static Range of(int lo, int hi) {
        if (lo > hi) {
            throw new IllegalArgumentException("lo > hi");
        }
        return new Range(lo, hi);
    }
}
```

## Good

```java
record Range(int lo, int hi) {
    Range {
        if (lo > hi) {
            throw new IllegalArgumentException("lo > hi: " + lo + " > " + hi);
        }
    }
}
```

## See Also

- [java-type-record-data-carrier](type-record-data-carrier.md) - the declaration this constructor belongs to
- [java-type-record-accessor-invariants](type-record-accessor-invariants.md) - the complementary rule for accessors
