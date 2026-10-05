---
id: java-type-pattern-instanceof
lang: java
prefix: type
title: "Use a type pattern in instanceof instead of a cast on the next line"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [instanceof, pattern, cast, narrowing]
  files: ["**/*.java"]
  symbols: [instanceof]
related: [java-type-record-pattern, java-type-switch-guard]
sources:
  - title: "JEP 394: Pattern Matching for instanceof"
    url: https://openjdk.org/jeps/394
---
> Bind the narrowed value in the instanceof pattern instead of casting after the test.

## Why

JEP 394 describes the instanceof-and-cast idiom as "tedious" and notes that the repeated type name "obfuscates the more significant logic that follows" while "the repetition provides opportunities for errors to creep unnoticed into programs". A type pattern performs the test and the conversion in one step, so the variable cannot drift from the checked type.

## Bad

```java
class Formatter {
    String format(Object value) {
        if (value instanceof String) {
            String text = (String) value;
            return text.strip();
        }
        return value.toString();
    }
}
```

## Good

```java
class Formatter {
    String format(Object value) {
        if (value instanceof String text) {
            return text.strip();
        }
        return value.toString();
    }
}
```

## See Also

- [java-type-record-pattern](type-record-pattern.md) - extending the same idea to record components
- [java-type-switch-guard](type-switch-guard.md) - the switch form of conditional matching
