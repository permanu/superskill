---
id: java-err-no-empty-catch
lang: java
prefix: err
title: "Never leave a catch block empty; take a named action or justify the no-op in a comment"
severity: should
enforce: tool
tool: "errorprone:EmptyCatch"
baseline: latest
status: verified
triggers:
  keywords: [catch, ignore, swallow, empty]
  files: ["**/*.java"]
  symbols: [NumberFormatException]
related: [java-err-catch-specific, java-err-interrupt-restore]
sources:
  - title: "Google Java Style Guide, section 6.2: Caught exceptions"
    url: https://google.github.io/styleguide/javaguide.html#s6.2-caught-exceptions
  - title: "Error Prone: EmptyCatch"
    url: https://errorprone.info/bugpattern/EmptyCatch
---
> Take a named action in every catch block, or state why doing nothing is correct.

## Why

An empty catch block turns failure into success with no signal: the caller sees a default value and no record shows that the operation did not happen. Google's style guide says it is very rarely correct to do nothing in response to a caught exception, and requires a comment when no action is the justified choice. Error Prone's EmptyCatch check reports the unannotated empty block.

## Bad

```java
class Parser {
    int parse(String text) {
        int value = 0;
        try {
            value = Integer.parseInt(text);
        } catch (NumberFormatException e) {
        }
        return value;
    }
}
```

## Good

```java
class Parser {
    int parse(String text) {
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException _) {
            // not numeric; fall back to the text length
            return text.length();
        }
    }
}
```

## See Also

- [java-err-catch-specific](err-catch-specific.md) - narrowing which failures the handler accepts
- [java-err-interrupt-restore](err-interrupt-restore.md) - the interruption case that is never safe to ignore
