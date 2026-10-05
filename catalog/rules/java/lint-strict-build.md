---
id: java-lint-strict-build
lang: java
prefix: lint
title: "Compile with -Xlint and fail the build on warnings"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [warnings, lint, build, werror]
  files: ["**/*.java"]
  symbols: [javac]
related: [java-lint-doclint]
sources:
  - title: "javac Command"
    url: https://docs.oracle.com/en/java/javase/23/docs/specs/man/javac.html
---
> Enable all recommended warnings and treat them as errors in CI.

## Why

The javac documentation says "-Xlint Enables all recommended warnings. In this release, enabling all available warnings is recommended", and "-Werror Terminates compilation when warnings occur." A warning that never fails a build is a warning that never gets fixed; the this-escape warning, for example, points at a constructor that calls an overridable method before the subclass has finished initializing.

## Bad

```java
public class Base {
    public Base() {
        init();
    }

    public void init() {
    }
}
```

## Good

```java
public class Base {
    public Base() {
        init();
    }

    private void init() {
    }
}
```

## See Also

- [java-lint-doclint](lint-doclint.md) - the documentation counterpart of the same policy
