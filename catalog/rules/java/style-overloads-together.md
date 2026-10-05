---
id: java-style-overloads-together
lang: java
prefix: style
title: "Keep overloads of a method contiguous"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [overload, ordering, methods]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-style-one-top-level-class]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Group same-named methods with no other members between them.

## Why

Google style section 3.4.2.1 requires that "methods of a class that share the same name appear in a single contiguous group with no other members in between", and the same for constructors. When overloads are scattered, a reader cannot tell whether all variants were reviewed together, and a new overload tends to land next to whichever caller happened to need it.

## Bad

```java
class Log {
    void write(String message) {
    }

    void flush() {
    }

    void write(String message, Throwable cause) {
    }
}
```

## Good

```java
class Log {
    void write(String message) {
    }

    void write(String message, Throwable cause) {
    }

    void flush() {
    }
}
```

## See Also

- [java-style-one-top-level-class](style-one-top-level-class.md) - the file-level counterpart
