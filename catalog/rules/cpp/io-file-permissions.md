---
id: cpp-io-file-permissions
lang: cpp
prefix: io
title: Set restrictive permissions on files that hold sensitive data
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [permissions, chmod, secrets, files]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [chmod]
related: [cpp-sec-no-hardcoded-secrets, cpp-io-atomic-replace]
sources:
  - title: "CWE-276: Incorrect Default Permissions"
    url: https://cwe.mitre.org/data/definitions/276.html
---
> Grant access and modification rights only to the users who require them.

## Why

A file created with the process's default mode is exposed to whichever accounts the ambient umask permits, and CWE-276 records that overly broad installed permissions let other users read or modify data the application treats as private: keys, tokens, logs, and configuration. The mitigation is to grant access and modification attributes only to the users who actually need the action, which for a private key or credential file means the owning account alone. Set the mode explicitly at creation time rather than trusting the ambient umask.

## Bad

```cpp
#include <fstream>
#include <sys/stat.h>

int main() {
    std::ofstream key_file("client.key");
    key_file << "private material\n";
    key_file.close();
    ::chmod("client.key", 0644); // readable by every account
    return 0;
}
```

## Good

```cpp
#include <fstream>
#include <sys/stat.h>

int main() {
    std::ofstream key_file("client.key");
    key_file << "private material\n";
    key_file.close();
    ::chmod("client.key", 0600); // owner-only
    return 0;
}
```

## See Also

- [cpp-sec-no-hardcoded-secrets](sec-no-hardcoded-secrets.md) - the values these permissions protect
- [cpp-io-atomic-replace](io-atomic-replace.md) - keeping the replacement's permissions consistent
