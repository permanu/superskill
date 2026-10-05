---
id: java-data-cancel
lang: java
prefix: data
title: "Cancel statements that outlive their deadline"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [jdbc, cancel, timeout, statement]
  files: ["**/*.java"]
  symbols: [Statement.cancel]
related: [java-data-transaction]
sources:
  - title: "Statement API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.sql/java/sql/Statement.html
---
> Call cancel when a statement must not run past its deadline.

## Why

Statement.cancel "cancels this Statement object if both the DBMS and driver support aborting an SQL statement". A query with no bound can run for minutes and hold connections, locks, and threads; a supervising task that cancels at the deadline turns an overrunning statement into a bounded failure, and disarming the task in a finally keeps it from cancelling a statement that already finished.

## Bad

```java
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

class Query {
    ResultSet run(Connection connection) throws SQLException {
        Statement statement = connection.createStatement();
        return statement.executeQuery("SELECT * FROM events");
    }
}
```

## Good

```java
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

class Query {
    ResultSet run(Connection connection, ScheduledExecutorService scheduler) throws SQLException {
        Statement statement = connection.createStatement();
        var timeout = scheduler.schedule(() -> {
            try {
                statement.cancel();
            } catch (SQLException e) {
                throw new IllegalStateException(e);
            }
        }, 30, TimeUnit.SECONDS);
        try {
            return statement.executeQuery("SELECT * FROM events");
        } finally {
            timeout.cancel(false);
        }
    }
}
```

## See Also

- [java-data-transaction](data-transaction.md) - releasing the transaction when the query fails
