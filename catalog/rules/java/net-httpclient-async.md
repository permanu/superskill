---
id: java-net-httpclient-async
lang: java
prefix: net
title: "Overlap requests with sendAsync"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [httpclient, async, concurrency, requests]
  files: ["**/*.java"]
  symbols: [HttpClient.sendAsync]
related: [java-net-httpclient-reuse, java-async-all-of]
sources:
  - title: "HttpClient API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.net.http/java/net/http/HttpClient.html
---
> Issue independent requests together with sendAsync instead of one blocking send after another.

## Why

HttpClient.sendAsync "sends the given request asynchronously using this client with the given response body handler", returning a CompletableFuture. A loop of blocking send calls issues requests strictly one at a time, so total latency is the sum of every round trip; the asynchronous form lets the client's connection pool carry the requests concurrently and completes when they are done.

## Bad

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

class Fetch {
    void fetchAll(HttpClient client, List<URI> uris) throws Exception {
        for (URI uri : uris) {
            client.send(HttpRequest.newBuilder(uri).build(), HttpResponse.BodyHandlers.ofString());
        }
    }
}
```

## Good

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.concurrent.CompletableFuture;

class Fetch {
    CompletableFuture<?>[] fetchAll(HttpClient client, List<URI> uris) {
        return uris.stream()
                .map(uri -> client.sendAsync(
                        HttpRequest.newBuilder(uri).build(),
                        HttpResponse.BodyHandlers.ofString()))
                .toArray(CompletableFuture[]::new);
    }
}
```

## See Also

- [java-net-httpclient-reuse](net-httpclient-reuse.md) - the pool that carries the concurrent requests
- [java-async-all-of](async-all-of.md) - waiting for the whole batch
