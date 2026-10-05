---
id: java-lint-long-suffix
lang: java
prefix: lint
title: "Write long literals with an uppercase L suffix"
severity: prefer
enforce: tool
tool: "errorprone:LongLiteralLowerCaseSuffix"
baseline: latest
status: verified
triggers:
  keywords: [literal, long, suffix, formatting]
  files: ["**/*.java"]
  symbols: [LongLiteralLowerCaseSuffix]
related: [java-lint-int-long-math]
sources:
  - title: "Error Prone: LongLiteralLowerCaseSuffix"
    url: https://errorprone.info/bugpattern/LongLiteralLowerCaseSuffix
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Use L, not l, so the suffix is not read as a digit.

## Why

Error Prone's LongLiteralLowerCaseSuffix check notes that "a long literal can have a suffix of 'L' or 'l', but the former is less likely to be confused with a '1' in most fonts", and Google style section 4.8.8 requires that "long-valued integer literals use an uppercase L suffix, never lowercase (to avoid confusion with the digit 1)".

## Bad

```java
class Limits {
    long max = 3000000000l;
}
```

## Good

```java
class Limits {
    long max = 3000000000L;
}
```

## See Also

- [java-lint-int-long-math](lint-int-long-math.md) - the other long-literal hazard
