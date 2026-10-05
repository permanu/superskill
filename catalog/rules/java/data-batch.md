---
id: java-data-batch
lang: java
prefix: data
title: "Send bulk statements as a batch"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [jdbc, batch, bulk, statement]
  files: ["**/*.java"]
  symbols: [Statement.addBatch, Statement.executeBatch]
related: [java-data-transaction]
sources:
  - title: "Statement API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.sql/java/sql/Statement.html
---
> Queue repeated statements with addBatch and send them with executeBatch.

## Why

Statement.addBatch "adds the given SQL command to the current list of commands for this Statement object", and the queued commands are executed together by executeBatch. Executing the same statement once per row pays a round trip each time, so bulk inserts scale with the network latency instead of the data; the batch sends the group as one operation.

## Bad

```java
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

class Import {
    void insert(Connection connection, String[] rows) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            for (String row : rows) {
                statement.executeUpdate("INSERT INTO items VALUES ('" + row + "')");
            }
        }
    }
}
```

## Good

```java
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

class Import {
    void insert(Connection connection, String[] rows) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            for (String row : rows) {
                statement.addBatch("INSERT INTO items VALUES ('" + row + "')");
            }
            statement.executeBatch();
        }
    }
}
```

## See Also

- [java-data-transaction](data-transaction.md) - committing the batch as one unit
