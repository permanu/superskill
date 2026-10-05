---
id: java-conc-vt-blocking-style
lang: java
prefix: conc
title: "Keep blocking sequential code on virtual threads instead of callback chains"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [virtual thread, blocking, async, callback, sequential]
  files: ["**/*.java"]
  symbols: [Thread.ofVirtual, CompletableFuture]
related: [java-conc-vt-not-pooled, java-conc-vt-not-cpu-bound]
sources:
  - title: "JEP 444: Virtual Threads"
    url: https://openjdk.org/jeps/444
---
> Write straightforward blocking code and let virtual threads provide the concurrency.

## Why

JEP 444 describes the asynchronous style as a price paid for scalability: it "requires what is known as an asynchronous programming style" where developers "forsake the language's basic sequential composition operators, such as loops and try/catch blocks", and it damages diagnosis because "stack traces provide no usable context". Virtual threads remove the scalability reason for that style: blocking calls unmount the virtual thread and free the carrier, so sequential code keeps its loops, its try/catch, and its readable stack traces.

## Bad

```java
import java.util.concurrent.CompletableFuture;

class Fetch {
    CompletableFuture<String> load(String url) {
        return CompletableFuture.supplyAsync(() -> fetch(url))
                .thenCompose(body -> CompletableFuture.supplyAsync(() -> parse(body)));
    }

    private String fetch(String url) {
        return url;
    }

    private String parse(String body) {
        return body;
    }
}
```

## Good

```java
class Fetch {
    String load(String url) throws InterruptedException {
        return parse(fetch(url));
    }

    private String fetch(String url) throws InterruptedException {
        Thread.sleep(10);
        return url;
    }

    private String parse(String body) {
        return body;
    }
}
```

## See Also

- [java-conc-vt-not-pooled](conc-vt-not-pooled.md) - the executor that runs this blocking code per task
- [java-conc-vt-not-cpu-bound](conc-vt-not-cpu-bound.md) - the workload boundary of the blocking style
