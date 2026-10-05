---
id: java-test-naming
lang: java
prefix: test
title: "Name test classes after the class under test and methods after the behavior"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, test, class, method]
  files: ["**/*.java"]
  symbols: [Test]
related: [java-test-nested]
sources:
  - title: "Google Java Style Guide, section 5.2.2: Class names"
    url: https://google.github.io/styleguide/javaguide.html#s5.2.2-class-names
---
> Follow the XTest convention and describe the expected behavior in the method name.

## Why

Google's style guide defines the convention: "A test class has a name that ends with Test... If it covers a single class, its name is the name of that class plus Test", and "underscores may appear in JUnit test method names to separate logical components of the name". Names like test1 or MoneyTests tell a failing build report nothing; add_sumsBothAmounts and MoneyTest say what broke and what it covers without opening the file.

## Bad

```java
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MoneyTests {
    @Test
    void test1() {
        assertEquals(2, new Money().add(1, 1));
    }
}

class Money {
    int add(int a, int b) {
        return a + b;
    }
}
```

## Good

```java
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MoneyTest {
    @Test
    void add_sumsBothAmounts() {
        assertEquals(2, new Money().add(1, 1));
    }
}

class Money {
    int add(int a, int b) {
        return a + b;
    }
}
```

## See Also

- [java-test-nested](test-nested.md) - structuring many behaviors without name prefixes
