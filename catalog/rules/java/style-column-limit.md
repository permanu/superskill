---
id: java-style-column-limit
lang: java
prefix: style
title: "Wrap code at 100 columns"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [columns, line-length, wrapping]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-style-kr-braces]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Keep lines within 100 characters and wrap the ones that do not fit.

## Why

Google style section 4.4 sets a "column limit of 100 characters" and requires that "any line that would exceed this limit must be line-wrapped". Long lines force horizontal scrolling in reviews, hide the structure of nested calls, and make side-by-side diffs unreadable; wrapping moves the extra content to continuation lines where it can be reviewed in place.

## Bad

```java
class Message {
    String describe(String first, String second, String third, String fourth, String fifth, String sixth) {
        return first + second + third + fourth + fifth + sixth;
    }
}
```

## Good

```java
class Message {
    String describe(
            String first, String second, String third,
            String fourth, String fifth, String sixth) {
        return first + second + third + fourth + fifth + sixth;
    }
}
```

## See Also

- [java-style-kr-braces](style-kr-braces.md) - the brace placement wrapping interacts with
