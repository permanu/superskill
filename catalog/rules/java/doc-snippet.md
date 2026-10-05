---
id: java-doc-snippet
lang: java
prefix: doc
title: "Show code examples with {@snippet}"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [javadoc, snippet, example, documentation]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-doc-code]
sources:
  - title: "JavaDoc Documentation Comment Specification"
    url: https://docs.oracle.com/en/java/javase/26/docs/specs/javadoc/doc-comment-spec.html
---
> Use {@snippet} for examples; it marks code as a snippet and can pull content from external files.

## Why

The Javadoc specification says {@snippet} "includes a fragment, or 'snippet', of example code in the generated documentation", with the code "provided inline within the tag by specifying a body and/or in an external file". Inline content is taken verbatim without HTML or entity work, and external snippets "have no limitations on their content", avoiding the inline restrictions on `*/` and unbalanced braces that come with older hand-assembled `<pre>{@code ...}</pre>` blocks.

## Bad

```java
import java.util.List;

class SortExample {
    /**
     * Sorts a list in place.
     *
     * <pre>{@code
     * List<String> names = List.of("b", "a");
     * names.sort(null);
     * }</pre>
     */
    static void sort(List<String> names) {
        names.sort(null);
    }
}
```

## Good

```java
import java.util.List;

class SortExample {
    /**
     * Sorts a list in place.
     *
     * {@snippet :
     * List<String> names = List.of("b", "a");
     * names.sort(null);
     * }
     */
    static void sort(List<String> names) {
        names.sort(null);
    }
}
```

## See Also

- [java-doc-code](doc-code.md) - the inline tag for short fragments
