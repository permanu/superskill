---
id: java-style-constant-names
lang: java
prefix: style
title: "Name constants in UPPER_SNAKE_CASE"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constants, naming, uppercase]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-style-camel-case, java-style-modifier-order]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Reserve UPPER_SNAKE_CASE for static final deeply immutable values.

## Why

Google style section 5.2.4 says "constant names use UPPER_SNAKE_CASE: all uppercase letters, with each word separated from the next by a single underscore", and defines constants as "static final fields whose contents are deeply immutable and whose methods have no detectable side effects". The casing then carries information: a mutable static final collection is not a constant and must not look like one.

## Bad

```java
class Limits {
    static final int maxRetries = 3;
}
```

## Good

```java
class Limits {
    static final int MAX_RETRIES = 3;
}
```

## See Also

- [java-style-camel-case](style-camel-case.md) - the casing rules for everything else
- [java-style-modifier-order](style-modifier-order.md) - ordering the static final modifiers
