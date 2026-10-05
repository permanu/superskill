---
id: java-style-kr-braces
lang: java
prefix: style
title: "Place braces in K&R style for nonempty blocks"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [braces, formatting, style]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-style-braces-always]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Keep the opening brace on the same line and the closing brace on its own line.

## Why

Google style section 4.1.2 specifies the Kernighan and Ritchie style for nonempty blocks: "no line break before the opening brace", "line break after the opening brace", and "line break before the closing brace". A consistent brace position keeps the block structure visible at a glance and lets diffs line up cleanly, instead of depending on the author's habit.

## Bad

```java
class Guard
{
    int limit(int value)
    {
        return value;
    }
}
```

## Good

```java
class Guard {
    int limit(int value) {
        return value;
    }
}
```

## See Also

- [java-style-braces-always](style-braces-always.md) - the requirement that the braces exist
