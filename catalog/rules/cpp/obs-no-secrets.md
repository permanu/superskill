---
id: cpp-obs-no-secrets
lang: cpp
prefix: obs
title: Never write secrets or sensitive data into logs
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [secrets, logging, security, credentials]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-obs-exception-what, cpp-obs-error-code-message]
sources:
  - title: "CWE-532: Insertion of Sensitive Information into Log File"
    url: https://cwe.mitre.org/data/definitions/532.html
---
> Log the event, never the credential; logs are read more widely than the data they describe.

## Why

Log files are copied, shipped to aggregators, and opened by people who are not allowed to see the original data, so a password, token, or key written to a log is a credential leak with a long tail: CWE-532 records real incidents where verbose logging exposed admin credentials and SSH keys. The mitigation is to log what happened, not the sensitive value, and to scrub or omit fields before the line is built.

## Bad

```cpp
#include <iostream>

void log_login(const char* user, const char* password) {
    std::clog << "login: " << user << " password=" << password << '\n'; // secret leaked
}

int main() {
    log_login("alice", "hunter2");
}
```

## Good

```cpp
#include <iostream>

void log_login(const char* user) {
    std::clog << "login attempt: " << user << '\n'; // no secret in the log
}

int main() {
    log_login("alice");
}
```

## See Also

- [cpp-obs-exception-what](obs-exception-what.md) - messages can also carry sensitive data
- [cpp-obs-error-code-message](obs-error-code-message.md) - prefer category text over raw payloads
