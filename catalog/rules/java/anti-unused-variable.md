---
id: java-anti-unused-variable
lang: java
prefix: anti
title: "Remove unused variables"
severity: prefer
enforce: tool
tool: "errorprone:UnusedVariable"
baseline: latest
status: verified
triggers:
  keywords: [unused, variable, dead-code, cleanup]
  files: ["**/*.java"]
  symbols: [UnusedVariable]
related: [java-anti-self-assignment]
sources:
  - title: "Error Prone: UnusedVariable"
    url: https://errorprone.info/bugpattern/UnusedVariable
---
> An unused variable may be a bug or dead weight; delete it.

## Why

Error Prone's UnusedVariable check says "the presence of an unused variable may indicate a bug" — a computed value that was meant to be stored or returned but never is. Even when it is not a bug, the variable is code the reader must decode and the writer must maintain; private fields and parameters that nothing reads are safe to remove without considering other files.

## Bad

```java
class Report {
    private String title;

    String render() {
        return "report";
    }
}
```

## Good

```java
class Report {
    String render() {
        return "report";
    }
}
```

## See Also

- [java-anti-self-assignment](anti-self-assignment.md) - the bug this check uncovers
