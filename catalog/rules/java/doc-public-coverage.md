---
id: java-doc-public-coverage
lang: java
prefix: doc
title: "Document every visible class and member with Javadoc"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [javadoc, public-api, documentation]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-doc-override-omit, java-doc-package-info]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Put Javadoc on public and protected API; visibility is the trigger, not personal taste.

## Why

Google style section 7.3 requires that "at the minimum, Javadoc is present for every visible class, member, or record component", where "a top-level class is visible if it is public" and "a member is visible if it is public or protected and its containing class is visible". The exceptions are narrow (self-explanatory members and overrides). Anything visible is a contract someone else can call, so its purpose belongs in the generated documentation rather than only in the author's head.

## Bad

```java
public class RetryPolicy {
    public int maxAttempts() {
        return 3;
    }
}
```

## Good

```java
/**
 * Limits how many times an operation may be retried.
 */
public class RetryPolicy {

    /**
     * Returns the maximum number of attempts.
     */
    public int maxAttempts() {
        return 3;
    }
}
```

## See Also

- [java-doc-override-omit](doc-override-omit.md) - the override exception to this coverage
- [java-doc-package-info](doc-package-info.md) - covering the package level as well
