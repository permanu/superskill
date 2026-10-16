---
id: java-data-next-exception
lang: java
prefix: data
title: "Bound SQLException traversal and expose only approved categories"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [jdbc, sqlexception, chained, diagnostics]
  files: ["**/*.java"]
  symbols: [SQLException.getNextException]
related: [shared-obs-allowlisted-diagnostics, java-err-wrap-cause]
sources:
  - title: PostgreSQL - Error Codes
    url: https://www.postgresql.org/docs/current/errcodes-appendix.html
  - title: "OWASP Logging Cheat Sheet"
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  - title: "SQLException API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.sql/java/sql/SQLException.html
---
> Bound SQLException chain traversal and classify approved SQL states without exporting driver messages.

## Why

Drivers attach related SQL failures through `getNextException`, but their messages can include SQL values, credentials or customer data. Traverse within a fixed bound and classify only known state values; map every other value to a static category. A bound also stops cyclic or excessive chains, and the original exceptions remain internal for an authorized investigation.

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
        StringBuilder categories = new StringBuilder();
        SQLException current = error;
        for (int count = 0; current != null && count < 16; count++) {
            String category = "23505".equals(current.getSQLState()) ? "DUPLICATE_KEY" : "DATABASE_FAILURE";
            categories.append(category).append(';');
            current = current.getNextException();
        }
        if (current != null) categories.append("CHAIN_LIMIT");
        return categories.toString();
    }
}
```

## See Also

- [java-err-wrap-cause](err-wrap-cause.md) - preserving the cause when translating exceptions
