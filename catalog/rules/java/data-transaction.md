---
id: java-data-transaction
lang: java
prefix: data
title: "Wrap multi-statement writes in an explicit transaction"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [jdbc, transaction, commit, autocommit]
  files: ["**/*.java"]
  symbols: [Connection.setAutoCommit]
related: [java-data-batch]
sources:
  - title: "Connection API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.sql/java/sql/Connection.html
---
> Disable auto-commit for multi-step writes and commit once, rolling back on failure.

## Why

The Connection documentation states that "by default a Connection object is in auto-commit mode, which means that it automatically commits changes after executing each statement. If auto-commit mode has been disabled, the method commit must be called explicitly in order to commit changes; otherwise, database changes will not be saved." A transfer written as several statements under auto-commit commits each step separately, so a failure halfway leaves the data inconsistent.

## Bad

```java
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

class Transfer {
    void transfer(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE accounts SET balance = balance - 10 WHERE id = 1");
            statement.executeUpdate("UPDATE accounts SET balance = balance + 10 WHERE id = 2");
        }
    }
}
```

## Good

```java
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

class Transfer {
    void transfer(Connection connection) throws SQLException {
        connection.setAutoCommit(false);
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE accounts SET balance = balance - 10 WHERE id = 1");
            statement.executeUpdate("UPDATE accounts SET balance = balance + 10 WHERE id = 2");
            connection.commit();
        } catch (SQLException e) {
            connection.rollback();
            throw e;
        }
    }
}
```

## See Also

- [java-data-batch](data-batch.md) - batching the statements inside the transaction
