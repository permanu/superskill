---
id: java-type-switch-null
lang: java
prefix: type
title: "Handle null explicitly in pattern switches with a case null label"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [switch, "null", pattern, selector]
  files: ["**/*.java"]
  symbols: [switch]
related: [java-type-exhaustive-switch, java-type-switch-guard]
sources:
  - title: "JEP 441: Pattern Matching for switch"
    url: https://openjdk.org/jeps/441
---
> Put the null case inside the switch instead of guarding the selector with an if statement.

## Why

JEP 441 regularizes null handling for pattern switches: a null label "will match a null value", and without one "switching over a null value will throw NullPointerException, just as before". An if-guard before the switch duplicates the dispatch logic and is easy to lose when the method is refactored; the case null label keeps every outcome of the selector in one exhaustive block.

## Bad

```java
sealed interface Result permits Ok, Failed {
}

record Ok(String value) implements Result {
}

record Failed(String reason) implements Result {
}

class Reporter {
    String report(Result result) {
        if (result == null) {
            return "missing";
        }
        return switch (result) {
            case Ok ok -> ok.value();
            case Failed failed -> failed.reason();
        };
    }
}
```

## Good

```java
sealed interface Result permits Ok, Failed {
}

record Ok(String value) implements Result {
}

record Failed(String reason) implements Result {
}

class Reporter {
    String report(Result result) {
        return switch (result) {
            case null -> "missing";
            case Ok ok -> ok.value();
            case Failed failed -> failed.reason();
        };
    }
}
```

## See Also

- [java-type-exhaustive-switch](type-exhaustive-switch.md) - coverage rules for the rest of the switch block
- [java-type-switch-guard](type-switch-guard.md) - adding conditions to a case label
