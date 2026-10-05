---
id: java-data-next-exception
lang: java
prefix: data
title: "Walk the SQLException chain for the full failure"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [jdbc, sqlexception, chained, diagnostics]
  files: ["**/*.java"]
  symbols: [SQLException.getNextException]
related: [java-err-wrap-cause]
sources:
  - title: "SQLException API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.sql/java/sql/SQLException.html
---
> Report every chained SQLException, not just the first.

## Why

SQLException.getNextException "retrieves the exception chained to this SQLException object by setNextException(SQLException ex)", and iterator() "returns an iterator over the chained SQLExceptions". Drivers attach follow-up failures — constraint violations, connection losses — to the first exception, so reporting only the head of the chain drops exactly the details an operator needs to diagnose the failure.

## Bad

```java
import java.sql.SQLException;

class Errors {
    String describe(SQLException error) {
        return error.getMessage();
    }
}
```

## Good

```java
import java.sql.SQLException;

class Errors {
    String describe(SQLException error) {
        StringBuilder message = new StringBuilder();
        for (SQLException current = error; current != null; current = current.getNextException()) {
            message.append(current.getMessage()).append("; ");
        }
        return message.toString();
    }
}
```

## See Also

- [java-err-wrap-cause](err-wrap-cause.md) - preserving the cause when translating exceptions
