---
id: java-style-braces-always
lang: java
prefix: style
title: "Brace every if, else, for, do, and while body"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [braces, if, loop, formatting]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-style-kr-braces]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Write braces even for single-statement bodies; the next edit adds a second statement.

## Why

Google style section 4.1.1 requires that "braces are used with if, else, for, do and while statements, even when the body is empty or contains only a single statement". An unbraced body makes the statement's scope depend on indentation rather than syntax, so adding one more line — or an accidental semicolon — silently changes what the code does.

## Bad

```java
class Guard {
    int limit(int value) {
        if (value < 0)
            return 0;
        return value;
    }
}
```

## Good

```java
class Guard {
    int limit(int value) {
        if (value < 0) {
            return 0;
        }
        return value;
    }
}
```

## See Also

- [java-style-kr-braces](style-kr-braces.md) - where the braces go once they exist
