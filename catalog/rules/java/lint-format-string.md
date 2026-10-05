---
id: java-lint-format-string
lang: java
prefix: lint
title: "Match format specifiers to their arguments"
severity: must
enforce: tool
tool: "errorprone:FormatString"
baseline: latest
status: verified
triggers:
  keywords: [format, printf, string, conversion]
  files: ["**/*.java"]
  symbols: [FormatString]
sources:
  - title: "Error Prone: FormatString"
    url: https://errorprone.info/bugpattern/FormatString
---
> Use the conversion that matches the argument type; wrong specifiers throw at runtime.

## Why

Error Prone's FormatString check requires that "format strings for the printf family of functions must follow the specification in the documentation for java.util.Formatter" and reports cases such as IllegalFormatConversion — "the argument corresponding to the format specifier is of an incompatible type", for example `String.format("%f", "abcd")`. The mismatch is invisible until the call runs, so it fails in production rather than at compile time.

## Bad

```java
class Message {
    String render(String name) {
        return String.format("Hello %d", name);
    }
}
```

## Good

```java
class Message {
    String render(String name) {
        return String.format("Hello %s", name);
    }
}
```
