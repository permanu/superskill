---
id: java-proj-process-builder
lang: java
prefix: proj
title: "Start external processes with ProcessBuilder"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [process, processbuilder, exec, shell]
  files: ["**/*.java"]
  symbols: [ProcessBuilder]
sources:
  - title: "Runtime API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Runtime.html
---
> Build process commands as argument lists; Runtime.exec(String) tokenizes and is deprecated.

## Why

Runtime.exec(String) is deprecated with the note "this method is error-prone and should not be used, the corresponding method exec(String[]) or ProcessBuilder should be used instead. The command string is broken into tokens using only whitespace characters. For an argument with an embedded space, such as a filename, this can cause problems as the token does not include the full filename." Passing the program and each argument separately removes that tokenization step entirely.

## Bad

```java
import java.io.IOException;

class Git {
    Process status() throws IOException {
        return Runtime.getRuntime().exec("git status --porcelain");
    }
}
```

## Good

```java
import java.io.IOException;

class Git {
    Process status() throws IOException {
        return new ProcessBuilder("git", "status", "--porcelain").start();
    }
}
```
