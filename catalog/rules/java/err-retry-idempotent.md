---
id: java-err-retry-idempotent
lang: java
prefix: err
title: "Retry only operations that are idempotent; a blind retry of a write can duplicate it"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [retry, idempotent, timeout, write]
  files: ["**/*.java"]
  symbols: [HttpClient, HttpRequest]
related: [java-err-future-observed]
sources:
  - title: "java.net.http module summary"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.net.http/module-summary.html
  - title: "HttpClient API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.net.http/java/net/http/HttpClient.html
---
> Retry only idempotent operations; make writes idempotent before they enter a retry loop.

## Why

A retry after a lost response repeats the request; for a non-idempotent write that means the effect happens twice. The JDK HTTP client encodes this rule in its own defaults: it auto-retries non-idempotent requests only when the jdk.httpclient.enableAllMethodRetry system property is explicitly enabled, and the default is false. An application retry loop that catches IOException around a POST has to apply the same constraint or the operation must carry an idempotency key.

## Bad

```java
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

class Payments {
    HttpResponse<String> charge(URI endpoint, String json) throws IOException, InterruptedException {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder(endpoint)
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                return client.send(request, HttpResponse.BodyHandlers.ofString());
            } catch (IOException e) {
                if (attempt == 3) {
                    throw e;
                }
            }
        }
        throw new IllegalStateException("unreachable");
    }
}
```

## Good

```java
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

class Catalog {
    HttpResponse<String> fetch(URI endpoint) throws IOException, InterruptedException {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder(endpoint).GET().build();
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                return client.send(request, HttpResponse.BodyHandlers.ofString());
            } catch (IOException e) {
                if (attempt == 3) {
                    throw e;
                }
            }
        }
        throw new IllegalStateException("unreachable");
    }
}
```

## See Also

- [java-err-future-observed](err-future-observed.md) - observing the outcome of each attempt
