---
id: java-proj-package-private
lang: java
prefix: proj
title: "Use the most restrictive access level that works"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [access, private, package-private, api]
  files: ["**/*.java"]
  symbols: [Package]
related: [java-proj-named-package]
sources:
  - title: "Java Tutorials: Controlling Access to Members of a Class"
    url: https://docs.oracle.com/javase/tutorial/java/javaOO/accesscontrol.html
---
> Default members to private; widen only for a caller that needs them.

## Why

The access-control lesson's tips are direct: "Use the most restrictive access level that makes sense for a particular member. Use private unless you have a good reason not to", and "avoid public fields except for constants". Every public member becomes API that other code can depend on, so a field exposed for convenience removes the freedom to change the representation later.

## Bad

```java
class Account {
    public String owner;
    public int balance;

    public void deposit(int amount) {
        balance += amount;
    }
}
```

## Good

```java
class Account {
    private String owner;
    private int balance;

    void deposit(int amount) {
        balance += amount;
    }

    int balance() {
        return balance;
    }
}
```

## See Also

- [java-proj-named-package](proj-named-package.md) - the package that package-private access is scoped to
