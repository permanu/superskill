---
id: java-conc-vt-no-threadlocal-cache
lang: java
prefix: conc
title: "Do not cache expensive per-thread resources in ThreadLocal on virtual threads"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [virtual thread, threadlocal, cache, resource]
  files: ["**/*.java"]
  symbols: [ThreadLocal, Thread.ofVirtual]
related: [java-conc-threadlocal-cleanup, java-conc-vt-not-pooled]
sources:
  - title: "JEP 444: Virtual Threads"
    url: https://openjdk.org/jeps/444
  - title: "ThreadLocal API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/ThreadLocal.html
---
> Share expensive resources through explicit caches instead of one ThreadLocal copy per virtual thread.

## Why

JEP 444 warns that because virtual threads "can be very numerous, use thread locals only after careful consideration", specifically against using them "to pool costly resources among multiple tasks sharing the same thread in a thread pool". With a thread per task there is no sharing to exploit: each new thread builds its own copy of the cached resource, so a million tasks create a million caches. The ThreadLocal API confirms each thread holds its copy "as long as the thread is alive", so the cost is per virtual thread, not amortized.

## Bad

```java
import java.text.SimpleDateFormat;
import java.util.Date;

class Dates {
    private static final ThreadLocal<SimpleDateFormat> FORMAT =
            ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));

    String format(Date date) {
        return FORMAT.get().format(date);
    }
}
```

## Good

```java
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

class Dates {
    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    String format(LocalDate date) {
        return FORMAT.format(date);
    }
}
```

## See Also

- [java-conc-threadlocal-cleanup](conc-threadlocal-cleanup.md) - cleanup when ThreadLocal is the right tool
- [java-conc-vt-not-pooled](conc-vt-not-pooled.md) - why per-thread caching has no reuse to exploit
