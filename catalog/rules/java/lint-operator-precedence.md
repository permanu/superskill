---
id: java-lint-operator-precedence
lang: java
prefix: lint
title: "Parenthesize mixed operators"
severity: prefer
enforce: tool
tool: "errorprone:OperatorPrecedence"
baseline: latest
status: verified
triggers:
  keywords: [precedence, parentheses, operators]
  files: ["**/*.java"]
  symbols: [OperatorPrecedence]
related: [java-lint-strict-build]
sources:
  - title: "Error Prone: OperatorPrecedence"
    url: https://errorprone.info/bugpattern/OperatorPrecedence
---
> Make precedence explicit with parentheses when operators mix.

## Why

Error Prone's OperatorPrecedence check cites Google style section 4.7: "It is not reasonable to assume that every reader has the entire Java operator precedence table memorized." Its examples add parentheses to mixed expressions — `(a && b) || c`, `(a || b) ? c : d`, `(x + y) << 2` — so the grouping is visible instead of inferred.

## Bad

```java
class Flags {
    boolean enabled(boolean primary, boolean secondary, boolean forced) {
        return primary || secondary && forced;
    }
}
```

## Good

```java
class Flags {
    boolean enabled(boolean primary, boolean secondary, boolean forced) {
        return primary || (secondary && forced);
    }
}
```

## See Also

- [java-lint-strict-build](lint-strict-build.md) - running the check in a strict build
