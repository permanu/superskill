---
id: java-anti-missing-enum-cases
lang: java
prefix: anti
title: "Handle every enum constant or say why the default cannot happen"
severity: should
enforce: tool
tool: "errorprone:MissingCasesInEnumSwitch"
baseline: latest
status: verified
triggers:
  keywords: [switch, enum, default, exhaustiveness]
  files: ["**/*.java"]
  symbols: [MissingCasesInEnumSwitch]
related: [java-type-exhaustive-switch]
sources:
  - title: "Error Prone: MissingCasesInEnumSwitch"
    url: https://errorprone.info/bugpattern/MissingCasesInEnumSwitch
---
> A switch that skips enum constants leaves the author's intent unclear.

## Why

Error Prone's MissingCasesInEnumSwitch check shows a switch that handles RED and GREEN but not BLUE, and lists the three possibilities: "the default case is known to be impossible", the code intentionally falls out, or a case was forgotten. Its recommended fix for the impossible case is an explicit `default: throw new AssertionError(color);`, which documents the assumption and fails loudly if a constant is added later.

## Bad

```java
enum Color { RED, GREEN, BLUE }

class Paint {
    String label(Color color) {
        switch (color) {
            case RED:
                return "red";
            case GREEN:
                return "green";
        }
        return "unknown";
    }
}
```

## Good

```java
enum Color { RED, GREEN, BLUE }

class Paint {
    String label(Color color) {
        switch (color) {
            case RED:
                return "red";
            case GREEN:
                return "green";
            case BLUE:
                return "blue";
            default:
                throw new AssertionError(color);
        }
    }
}
```

## See Also

- [java-type-exhaustive-switch](type-exhaustive-switch.md) - the sealed-hierarchy version of the same concern
