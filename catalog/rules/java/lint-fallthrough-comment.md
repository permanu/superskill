---
id: java-lint-fallthrough-comment
lang: java
prefix: lint
title: "Mark intentional switch fall-through with a comment"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [switch, fallthrough, comment]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-type-exhaustive-switch]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Either break out of an old-style case or say that falling through is intended.

## Why

Google style section 4.8.4.2 requires that within an old-style switch "each statement group either terminates abruptly (with a break, continue, return or thrown exception), or is marked with a comment", typically `// fall through`. Without the marker, the next reader cannot tell an intended fall-through from a missing break.

## Bad

```java
class Levels {
    int weight(String level) {
        int weight = 0;
        switch (level) {
            case "debug":
                weight += 1;
            case "info":
                weight += 2;
                break;
            default:
                weight += 3;
        }
        return weight;
    }
}
```

## Good

```java
class Levels {
    int weight(String level) {
        int weight = 0;
        switch (level) {
            case "debug":
                weight += 1;
            // fall through
            case "info":
                weight += 2;
                break;
            default:
                weight += 3;
        }
        return weight;
    }
}
```

## See Also

- [java-type-exhaustive-switch](type-exhaustive-switch.md) - the arrow-switch form where fall-through does not exist
