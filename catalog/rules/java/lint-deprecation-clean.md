---
id: java-lint-deprecation-clean
lang: java
prefix: lint
title: "Fix deprecation warnings instead of accumulating them"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deprecation, warnings, migration]
  files: ["**/*.java"]
  symbols: [Deprecated]
related: [java-lint-strict-build, java-api-deprecate-with-replacement]
sources:
  - title: "javac Command"
    url: https://docs.oracle.com/en/java/javase/23/docs/specs/man/javac.html
  - title: "Integer API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Integer.html
---
> Build with -deprecation and migrate call sites; deprecation is a removal schedule.

## Why

The javac documentation notes that "without the -deprecation option, javac shows a summary of the source files that use or override deprecated members or classes. The -deprecation option is shorthand for -Xlint:deprecation." The Integer documentation shows where that leads: its int constructor is "Deprecated, for removal" because "the static factory valueOf(int) is generally a better choice". A warning left in place becomes a removal with no migration.

## Bad

```java
class Numbers {
    Integer value(int raw) {
        return new Integer(raw);
    }
}
```

## Good

```java
class Numbers {
    Integer value(int raw) {
        return Integer.valueOf(raw);
    }
}
```

## See Also

- [java-lint-strict-build](lint-strict-build.md) - making the warning fail the build
- [java-api-deprecate-with-replacement](api-deprecate-with-replacement.md) - writing deprecations callers can act on
