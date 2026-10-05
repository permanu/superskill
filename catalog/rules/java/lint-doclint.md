---
id: java-lint-doclint
lang: java
prefix: lint
title: "Keep documentation comments clean for doclint"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [javadoc, doclint, documentation, tags]
  files: ["**/*.java"]
  symbols: [javadoc]
related: [java-lint-strict-build, java-doc-param]
sources:
  - title: "javadoc Command"
    url: https://docs.oracle.com/en/java/javase/23/docs/specs/man/javadoc.html
---
> Leave doclint enabled and fix what it reports; stale tags ship broken docs.

## Why

The javadoc documentation states that "-Xdoclint Enables recommended checks for problems in documentation comments. By default, the -Xdoclint option is enabled. Disable it with the option -Xdoclint:none." Leaving the checks on catches tags that no longer match the declaration, such as a @param for a parameter that was renamed or removed.

## Bad

```java
class Parser {
    /**
     * Parses the text.
     *
     * @param input the raw text
     * @param limit the maximum length
     */
    static String parse(String input) {
        return input;
    }
}
```

## Good

```java
class Parser {
    /**
     * Parses the text.
     *
     * @param input the raw text
     * @return the parsed text
     */
    static String parse(String input) {
        return input;
    }
}
```

## See Also

- [java-lint-strict-build](lint-strict-build.md) - the compiler-side warning policy
- [java-doc-param](doc-param.md) - documenting the parameters the check verifies
