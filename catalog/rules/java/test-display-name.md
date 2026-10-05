---
id: java-test-display-name
lang: java
prefix: test
title: "Give tests human-readable display names"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [junit, displayname, reporting, names]
  files: ["**/*.java"]
  symbols: [DisplayName]
related: [java-test-naming]
sources:
  - title: "JUnit User Guide: Display Names"
    url: https://docs.junit.org/6.1.3/writing-tests/display-names.html
---
> Add @DisplayName so reports read like behavior, not identifiers.

## Why

The JUnit display names guide says that "test classes and test methods can declare custom display names via @DisplayName — with spaces, special characters, and even emojis — that will be displayed in test reports and by test runners and IDEs". Method names are constrained by identifier syntax, so a failure report full of abbreviated method names forces the reader to translate; a display name states the behavior in the report itself.

## Bad

```java
import org.junit.jupiter.api.Test;

class InvoiceTest {
    @Test
    void t1() {
    }
}
```

## Good

```java
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class InvoiceTest {
    @Test
    @DisplayName("invoice totals include tax")
    void totalsIncludeTax() {
    }
}
```

## See Also

- [java-test-naming](test-naming.md) - naming the class and method themselves
