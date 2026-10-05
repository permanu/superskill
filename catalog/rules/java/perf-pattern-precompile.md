---
id: java-perf-pattern-precompile
lang: java
prefix: perf
title: "Compile a regular expression once and reuse the Pattern"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [regex, pattern, compile, reuse]
  files: ["**/*.java"]
  symbols: [Pattern, Matcher]
sources:
  - title: "Pattern API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/regex/Pattern.html
---
> Hoist regex compilation into a static final Pattern instead of matching by string on every call.

## Why

The Pattern documentation for the convenience matching methods warns that "if a pattern is to be used multiple times, compiling it once and reusing it will be more efficient than invoking this method each time". String.matches and Pattern.matches compile the expression and build a Matcher on every call, so a validator invoked per request pays compilation per request. A compiled Pattern is immutable and safe to share across threads.

## Bad

```java
class EmailValidator {

    boolean isValid(String candidate) {
        return candidate.matches("[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}");
    }
}
```

## Good

```java
import java.util.regex.Pattern;

class EmailValidator {

    private static final Pattern EMAIL =
            Pattern.compile("[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}");

    boolean isValid(String candidate) {
        return EMAIL.matcher(candidate).matches();
    }
}
```
