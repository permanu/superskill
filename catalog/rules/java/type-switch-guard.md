---
id: java-type-switch-guard
lang: java
prefix: type
title: "Lift case refinements into when guards instead of nesting ifs inside a case"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [switch, when, guard, refinement, case]
  files: ["**/*.java"]
  symbols: [when]
related: [java-type-exhaustive-switch, java-type-switch-null]
sources:
  - title: "JEP 441: Pattern Matching for switch"
    url: https://openjdk.org/jeps/441
---
> Express per-case conditions as when guards so the whole dispatch is visible in the labels.

## Why

JEP 441 introduces guarded labels because "using a single pattern to discriminate among cases does not scale beyond a single condition", and notes that guards produce "a more readable style of switch programming where the complexity of the test appears on the left of a switch rule". An if nested inside a case hides the second condition from the dispatch structure, so readers must trace control flow inside the arm to learn when it applies.

## Bad

```java
class Classifier {
    String classify(String text) {
        if (text == null) {
            return "null";
        }
        return switch (text) {
            case String t -> {
                if (t.isEmpty()) {
                    yield "empty";
                }
                yield "text";
            }
        };
    }
}
```

## Good

```java
class Classifier {
    String classify(String text) {
        return switch (text) {
            case null -> "null";
            case String t when t.isEmpty() -> "empty";
            case String t -> "text";
        };
    }
}
```

## See Also

- [java-type-exhaustive-switch](type-exhaustive-switch.md) - keeping coverage visible while refining cases
- [java-type-switch-null](type-switch-null.md) - the null label used in the recommended form
