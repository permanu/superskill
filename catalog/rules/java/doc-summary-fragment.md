---
id: java-doc-summary-fragment
lang: java
prefix: doc
title: "Write the Javadoc summary as a phrase, not as 'This method...'"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [javadoc, summary, documentation, comment]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-doc-return]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Open each doc comment with a capitalized phrase that reads as a sentence; never start with "This method".

## Why

Google style section 7.2 defines the first line of Javadoc as a summary fragment: "a noun phrase or verb phrase, not a complete sentence. It does not begin with 'A Foo is a...', or 'This method returns...', nor does it form a complete imperative sentence like 'Save the record.' However, the fragment is capitalized and punctuated as if it were a complete sentence." The fragment is "the only part of the text that appears in certain contexts such as class and method indexes", so it must stand alone.

## Bad

```java
class Customer {
    private final String name;

    Customer(String name) {
        this.name = name;
    }

    /**
     * This method returns the name of the customer.
     */
    String name() {
        return name;
    }
}
```

## Good

```java
class Customer {
    private final String name;

    Customer(String name) {
        this.name = name;
    }

    /**
     * Returns the name of the customer.
     */
    String name() {
        return name;
    }
}
```

## See Also

- [java-doc-return](doc-return.md) - the inline form that makes the summary the return description
