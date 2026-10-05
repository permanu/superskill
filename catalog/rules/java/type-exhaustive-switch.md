---
id: java-type-exhaustive-switch
lang: java
prefix: type
title: "Switch exhaustively over sealed hierarchies and omit the default label"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [switch, sealed, exhaustive, default, coverage]
  files: ["**/*.java"]
  symbols: [switch]
related: [java-type-sealed-closed-kinds, java-type-switch-null, java-type-switch-guard]
sources:
  - title: "JEP 441: Pattern Matching for switch"
    url: https://openjdk.org/jeps/441
---
> Cover every permitted subtype explicitly and leave out default so a new subtype breaks the build.

## Why

JEP 441 states the tradeoff directly: "An exhaustive switch without a match-all clause is better than an exhaustive switch with one", because a match-all clause "risks sweeping exhaustiveness errors under the rug". With a default present, a subtype added later is silently routed to the fallback; without it, recompilation reports the missing case. The compiler only performs this check when the selector is a sealed type and no total label is present.

## Bad

```java
sealed interface Event permits Created, Deleted {
}

record Created(String id) implements Event {
}

record Deleted(String id) implements Event {
}

class Audit {
    String describe(Event event) {
        return switch (event) {
            case Created created -> "created " + created.id();
            case Deleted deleted -> "deleted " + deleted.id();
            default -> "unknown";
        };
    }
}
```

## Good

```java
sealed interface Event permits Created, Deleted {
}

record Created(String id) implements Event {
}

record Deleted(String id) implements Event {
}

class Audit {
    String describe(Event event) {
        return switch (event) {
            case Created created -> "created " + created.id();
            case Deleted deleted -> "deleted " + deleted.id();
        };
    }
}
```

## See Also

- [java-type-sealed-closed-kinds](type-sealed-closed-kinds.md) - the hierarchy that makes coverage checkable
- [java-type-switch-null](type-switch-null.md) - the one label a pattern switch may still need
- [java-type-switch-guard](type-switch-guard.md) - refining a case without hiding missing coverage
