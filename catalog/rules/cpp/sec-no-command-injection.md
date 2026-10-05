---
id: cpp-sec-no-command-injection
lang: cpp
prefix: sec
title: Never pass untrusted input to a shell; call a library instead
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [system, shell, injection, subprocess]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::system, popen]
related: [cpp-sec-path-traversal, cpp-io-path-type]
sources:
  - title: "CWE-78: Improper Neutralization of Special Elements used in an OS Command ('OS Command Injection')"
    url: https://cwe.mitre.org/data/definitions/78.html
  - title: cppreference - Filesystem library
    url: https://en.cppreference.com/w/cpp/filesystem
---
> A shell re-parses whatever the program concatenates; a library call never does.

## Why

Concatenating input into a command string hands the shell a language in which `;`, `|`, backticks, and `$()` are operators: CWE-78 is the resulting command injection, where input that looks like a directory name becomes a second command. The robust fix is not escaping but removing the shell: perform the operation with a library call, or spawn the program directly with an argument vector so no component parses the data again.

## Bad

```cpp
#include <cstdlib>
#include <string>

int list_directory(const std::string& name) {
    const std::string command = "ls " + name; // name joins the shell command
    return std::system(command.c_str());
}

int main() {
    return list_directory("dir; echo pwned");
}
```

## Good

```cpp
#include <filesystem>
#include <string>

int list_directory(const std::filesystem::path& directory) {
    int count = 0;
    for (const auto& entry : std::filesystem::directory_iterator(directory))
        ++count; // a library call: no shell parses the argument
    return count;
}

int main() {
    return list_directory(".") > 0 ? 0 : 1;
}
```

## See Also

- [cpp-sec-path-traversal](sec-path-traversal.md) - the same "untrusted text is data" rule for paths
- [cpp-io-path-type](io-path-type.md) - representing the argument as a path, not a command fragment
