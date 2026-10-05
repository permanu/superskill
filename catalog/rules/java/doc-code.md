---
id: java-doc-code
lang: java
prefix: doc
title: "Wrap code fragments in {@code} instead of HTML escapes"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [javadoc, code, html, documentation]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-doc-link, java-doc-snippet]
sources:
  - title: "JavaDoc Documentation Comment Specification"
    url: https://docs.oracle.com/en/java/javase/26/docs/specs/javadoc/doc-comment-spec.html
---
> Use {@code} for identifiers, operators, and generics; it renders in code font without HTML parsing.

## Why

The Javadoc specification states that {@code} "displays text in code font without interpreting the text as HTML markup or nested Javadoc tags", which "enables you to use regular angle brackets (< and >) instead of the HTML entities (&lt; and &gt;) in documentation comments, such as in parameter types (<Object>), inequalities (3 < 4), or arrows (->)". Entity-escaped fragments are hard to read in source, and unescaped angle brackets silently disappear from the generated page.

## Bad

```java
class Sorter {
    /**
     * Sorts values in ascending order using the &lt; operator.
     */
    static void sort(int[] values) {
    }
}
```

## Good

```java
class Sorter {
    /**
     * Sorts values in ascending order using the {@code <} operator.
     */
    static void sort(int[] values) {
    }
}
```

## See Also

- [java-doc-link](doc-link.md) - linking to the element instead of naming it
- [java-doc-snippet](doc-snippet.md) - the tag for whole code examples
