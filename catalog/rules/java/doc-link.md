---
id: java-doc-link
lang: java
prefix: doc
title: "Link program elements with {@link} instead of plain names"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [javadoc, link, reference, documentation]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-doc-code]
sources:
  - title: "JavaDoc Documentation Comment Specification"
    url: https://docs.oracle.com/en/java/javase/26/docs/specs/javadoc/doc-comment-spec.html
---
> Reference types and members with {@link}; the doclet resolves them and the reader can navigate.

## Why

The Javadoc specification describes {@link} as inserting "an inline link with a visible text label that points to the documentation for the specified module, package, class, or member name of a referenced class", and the doclet validates the reference when documentation is generated. A bare name in running text is neither checked nor clickable, so a rename silently leaves stale prose behind.

## Bad

```java
class Parser {
    /**
     * Returns a Result for the given input; see Result for details.
     */
    static Result parse(String input) {
        return new Result();
    }
}

class Result {
}
```

## Good

```java
class Parser {
    /**
     * Returns a {@link Result} for the given input.
     */
    static Result parse(String input) {
        return new Result();
    }
}

class Result {
}
```

## See Also

- [java-doc-code](doc-code.md) - the other inline tag for referring to code
