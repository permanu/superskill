---
id: java-err-finally-normally
lang: java
prefix: err
title: "Let finally blocks complete normally; a return or throw there discards the try's outcome"
severity: must
enforce: tool
tool: "errorprone:Finally"
baseline: latest
status: verified
triggers:
  keywords: [finally, return, throw, abrupt, discards]
  files: ["**/*.java"]
  symbols: [Math.addExact]
related: [java-err-try-with-resources, java-err-suppressed-cleanup]
sources:
  - title: "JLS 14.20.2: Execution of try-finally and try-catch-finally"
    url: https://docs.oracle.com/javase/specs/jls/se23/html/jls-14.html#jls-14.20.2
  - title: "Error Prone: Finally"
    url: https://errorprone.info/bugpattern/Finally
---
> Write finally blocks that always complete normally so they cannot replace the try's return value or exception.

## Why

JLS 14.20.2 defines that if the finally block completes abruptly, the try statement completes abruptly for the same reason: a return in finally silently discards the value or exception being delivered. Error Prone's Finally check flags the construct as fragile code because nothing fails, the wrong result simply leaves. Cleanup belongs in finally; decisions about the outcome do not.

## Bad

```java
class Ledger {
    int total(int deposit) {
        try {
            return Math.addExact(deposit, 100);
        } finally {
            return 0;
        }
    }
}
```

## Good

```java
class Ledger {
    int total(int deposit) {
        try {
            return Math.addExact(deposit, 100);
        } finally {
            audit(deposit);
        }
    }

    private void audit(int deposit) {
    }
}
```

## See Also

- [java-err-try-with-resources](err-try-with-resources.md) - the construct that removes most manual finally blocks
- [java-err-suppressed-cleanup](err-suppressed-cleanup.md) - recording cleanup failures without interrupting the outcome
