---
id: cpp-sec-fd-cloexec
lang: cpp
prefix: sec
title: Mark descriptors close-on-exec so children cannot inherit them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [file-descriptor, cloexec, fork, exec]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [O_CLOEXEC, open]
related: [cpp-sec-secure-temp-files, cpp-io-raii-streams]
sources:
  - title: "CWE-403: Exposure of File Descriptor to Unintended Control Sphere ('File Descriptor Leak')"
    url: https://cwe.mitre.org/data/definitions/403.html
  - title: "CWE-377: Insecure Temporary File"
    url: https://cwe.mitre.org/data/definitions/377.html
---
> Open sensitive descriptors with O_CLOEXEC so they vanish when a child is executed.

## Why

Every descriptor a process holds is inherited across `fork` and `exec`; CWE-403 records cases where a less-privileged child, or a program it launches, read or modified files that only the parent was entitled to touch. Setting the close-on-exec flag at open time removes the descriptor at `exec` without any cleanup code, so there is no window and no path that forgets to close. Descriptors that the child genuinely needs are the exception and should be passed deliberately.

## Bad

```cpp
#include <fcntl.h>
#include <unistd.h>

int open_secret() {
    return ::open("/etc/shadow", O_RDONLY); // inherited by every child
}

int main() {
    const int fd = open_secret();
    if (fd >= 0)
        ::close(fd);
    return 0;
}
```

## Good

```cpp
#include <fcntl.h>
#include <unistd.h>

int open_secret() {
    return ::open("/etc/shadow", O_RDONLY | O_CLOEXEC); // closed at exec
}

int main() {
    const int fd = open_secret();
    if (fd >= 0)
        ::close(fd);
    return 0;
}
```

## See Also

- [cpp-sec-secure-temp-files](sec-secure-temp-files.md) - the other lifetime trap around temporary descriptors
- [cpp-io-raii-streams](io-raii-streams.md) - handles that close themselves on every path
