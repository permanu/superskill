---
id: cpp-sec-secure-temp-files
lang: cpp
prefix: sec
title: Create temporary files atomically; never predict a name and open it later
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tempfile, tmpnam, race, atomic]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::tmpnam, std::tmpfile, mkstemp]
related: [cpp-io-no-toctou, cpp-sec-fd-cloexec]
sources:
  - title: "CWE-377: Insecure Temporary File"
    url: https://cwe.mitre.org/data/definitions/377.html
  - title: cppreference - std::filesystem
    url: https://en.cppreference.com/w/cpp/filesystem
---
> Let the OS create and open the file in one step; a name chosen first can be claimed by an attacker.

## Why

Name-generating functions such as `tmpnam` return a filename before any file exists, leaving a window in which another process can create that name as a symlink to a sensitive file; the program then opens the symlink and writes through it, which CWE-377 documents as a privilege-escalation route for elevated programs. The safe shape is a single call that creates and opens atomically: `std::tmpfile` (unnamed, removed on close) or a template-based primitive such as `mkstemp` that fails if the name is taken and opens owner-only.

## Bad

```cpp
#include <cstdio>

int main() {
    char name[L_tmpnam];
    std::tmpnam(name);                       // name exists before the file does
    std::FILE* file = std::fopen(name, "w"); // attacker can win the race
    if (file == nullptr)
        return 1;
    std::fputs("data", file);
    std::fclose(file);
    return 0;
}
```

## Good

```cpp
#include <cstdio>

int main() {
    std::FILE* file = std::tmpfile(); // created and opened in one step
    if (file == nullptr)
        return 1;
    std::fputs("data", file);
    std::fclose(file); // the unnamed file disappears with the handle
    return 0;
}
```

## See Also

- [cpp-io-no-toctou](io-no-toctou.md) - the general check-then-use pattern
- [cpp-sec-fd-cloexec](sec-fd-cloexec.md) - what else a descriptor must not leak
