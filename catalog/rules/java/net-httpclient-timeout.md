---
id: java-net-httpclient-timeout
lang: java
prefix: net
title: "Give every HTTP request a timeout"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [httpclient, timeout, request, deadline]
  files: ["**/*.java"]
  symbols: [HttpRequest.Builder.timeout]
related: [java-net-httpclient-reuse]
sources:
  - title: "HttpRequest.Builder API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.net.http/java/net/http/HttpRequest.Builder.html
---
> Set a request timeout so a stalled peer fails instead of hanging the caller.

## Why

HttpRequest.Builder.timeout "sets a timeout for this request", and when the response does not arrive in time the send completes with an HttpTimeoutException. Without one, a request waits on the peer indefinitely; the calling thread, and anything waiting on it, hangs until the connection fails at the network level — if it ever does.

## Bad

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

class Ping {
    String get(HttpClient client, String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url)).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString()).body();
    }
}
```

## Good

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

class Ping {
    String get(HttpClient client, String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .build();
        return client.send(request, HttpResponse.BodyHandlers.ofString()).body();
    }
}
```

## See Also

- [java-net-httpclient-reuse](net-httpclient-reuse.md) - the client this request is sent through
