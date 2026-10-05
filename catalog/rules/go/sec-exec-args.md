---
id: go-sec-exec-args
lang: go
prefix: sec
title: Pass external command arguments as arguments, never through a shell
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [os/exec, shell, command injection, arguments]
  files: ["**/*.go"]
  symbols: [exec.Command, exec.CommandContext]
related: [go-sec-valid-path, go-sec-sql-params]
sources:
  - title: Package os/exec
    url: https://pkg.go.dev/os/exec
  - title: Package os/exec - LookPath
    url: https://pkg.go.dev/os/exec
---
> Build commands from arguments; never interpolate input into a shell string.

## Why

The os/exec documentation says the package intentionally does not invoke the system shell and does not expand glob patterns, pipelines, or redirections, and that code which wants a shell must take care to escape dangerous input. Concatenating a host name or file name into an "sh -c" string reintroduces every shell metacharacter as an injection point, so a semicolon in the input becomes a second command. Command keeps the program and its arguments separate, which is the safe default.

## Bad

```go
import "os/exec"

func ping(host string) ([]byte, error) {
    return exec.Command("sh", "-c", "ping -c 1 "+host).Output()
}
```

## Good

```go
import "os/exec"

func ping(host string) ([]byte, error) {
    return exec.Command("ping", "-c", "1", host).Output()
}
```

## See Also

- [go-sec-valid-path](sec-valid-path.md) - the same separation for file paths
- [go-sec-sql-params](sec-sql-params.md) - the same separation for SQL
