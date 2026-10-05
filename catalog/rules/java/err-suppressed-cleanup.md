---
id: java-err-suppressed-cleanup
lang: java
prefix: err
title: "Record cleanup failures with addSuppressed when the primary failure is already propagating"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [suppressed, cleanup, close, primary, finally]
  files: ["**/*.java"]
  symbols: [addSuppressed, getSuppressed]
related: [java-err-try-with-resources, java-err-wrap-cause]
sources:
  - title: "Throwable API: addSuppressed"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Throwable.html#addSuppressed(java.lang.Throwable)
  - title: "Java Tutorials: The try-with-resources Statement"
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html
---
> Preserve the first exception and attach later cleanup failures with addSuppressed.

## Why

When a cleanup step fails while another failure is already unwinding, only one exception can propagate. Throwable.addSuppressed exists for exactly this case: "there are multiple sibling exceptions and only one can be propagated". Throwing the cleanup failure instead of the primary one replaces the diagnosis that explains the failure with the least important event of the sequence.

## Bad

```java
import java.io.IOException;
import java.io.OutputStream;

class Backup {
    void write(OutputStream out, byte[] data) throws IOException {
        try {
            out.write(data);
        } catch (IOException primary) {
            try {
                out.close();
            } catch (IOException closeFailure) {
                throw closeFailure;
            }
            throw primary;
        }
    }
}
```

## Good

```java
import java.io.IOException;
import java.io.OutputStream;

class Backup {
    void write(OutputStream out, byte[] data) throws IOException {
        try {
            out.write(data);
        } catch (IOException primary) {
            try {
                out.close();
            } catch (IOException closeFailure) {
                primary.addSuppressed(closeFailure);
            }
            throw primary;
        }
    }
}
```

## See Also

- [java-err-try-with-resources](err-try-with-resources.md) - the statement that applies suppression automatically
- [java-err-wrap-cause](err-wrap-cause.md) - the cause relation, which is different from suppression
